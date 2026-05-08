import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { MessageSquare, X, Send } from "lucide-react";
import { useMusic } from "../context/MusicContext";
import { supabase } from "../supabaseClient";

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const SYSTEM_PROMPT = `
You are a music-focused assistant. You only answer questions related to music — this includes artists, albums, genres, music theory, instruments, lyrics, concerts, music history, and recommendations.

When answering music-related questions, follow these formatting rules:
- Use **bold** for artist names, album titles, song titles, and key terms
- Use headers (##) to separate sections when the answer is long
- Use bullet points or numbered lists when listing multiple items
- Keep responses clear, organized, and engaging
- Add a fun or interesting music fact when relevant to keep the conversation lively

If the user asks about anything unrelated to music, respond with:
'**I'm sorry, I'm only supposed to answer questions related to music.** Feel free to ask me anything about songs, artists, genres, or anything else music-related! 🎵'

Do not answer off-topic questions under any circumstances, even if the user insists or tries to reframe the request.

---
APPLICATION CONTEXT:
You are connected to a Supabase music library. You will receive context in [System] blocks.
- If you see [System: Successfully found...], confirm the action to the user.
- Use ONLY the songs listed in the [System] context when responding about playlists or song lists.
- NEVER fabricate, invent, or suggest songs that are not explicitly listed in the [System] context.
- If a playlist was created, list ONLY the exact songs provided in the [System] block — no additions, no substitutions.
- If no songs were found, say so honestly and do not make up alternatives.
`;

const Chatbot = () => {
  const { playSong } = useMusic();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi there! I'm your music assistant. Looking for a specific vibe, want to check a song, or create a playlist?",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const supabaseQuery = async (endpoint, method = "GET", body = null) => {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token || SUPABASE_ANON_KEY;
    const userId = data?.session?.user?.id;
    const userEmail = data?.session?.user?.email;

    const options = {
      method,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
    };

    if (body) {
      // Auto-inject user_id and owner_email for POST requests if a user is logged in
      if (method === "POST" && userId && !Array.isArray(body)) {
        if (!body.user_id) body.user_id = userId;
        if (!body.owner_email && userEmail) body.owner_email = userEmail;
      }
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(`${SUPABASE_URL}${endpoint}`, options);
      if (!response.ok)
        throw new Error(`Supabase Error: ${response.statusText}`);
      return await response.json();
    } catch (error) {
      console.error(`Supabase API Error on ${endpoint}:`, error);
      return null;
    }
  };

  // Basic intent parsing to determine if we need to query Supabase
  const detectIntentAndFetchContext = async (userMsg) => {
    const msgLower = userMsg.toLowerCase();
    let context = null;

    // 0. PLAY — handles both title ("play Blinding Lights") and mood ("play something chill", "play sad songs")
    if (msgLower.startsWith("play ") || msgLower.includes("play me ")) {
      // Strip filler words to get the core search term
      const query = msgLower
        .replace(/^play me\s+/i, "")
        .replace(/^play\s+/i, "")
        .replace(/\b(something|some|a|an|the)\b/gi, "")
        .trim();

      // Step 1: Try to find a song by exact/partial title
      const titleResults = await supabaseQuery(
        `/rest/v1/songs?title=ilike.*${encodeURIComponent(query)}*&select=id,title,artist,genre,mood_tag,song_url&limit=1`,
      );

      if (titleResults && titleResults.length > 0) {
        // Found by title — play it
        const songToPlay = titleResults[0];
        playSong(songToPlay);
        context = `[System: Found and started playing "${songToPlay.title}" by ${songToPlay.artist}. Tell the user you are playing it now.]`;
      } else {
        // Step 2: No title match — try mood_tag and genre
        const moodResults = await supabaseQuery(
          `/rest/v1/songs?or=(mood_tag.ilike.*${encodeURIComponent(query)}*,genre.ilike.*${encodeURIComponent(query)}*)&select=id,title,artist,genre,mood_tag,song_url&limit=20`,
        );

        if (moodResults && moodResults.length > 0) {
          // Pick a random song for variety
          const pick = moodResults[Math.floor(Math.random() * moodResults.length)];
          playSong(pick);
          context = `[System: No song titled "${query}" was found. Instead, searched by mood/genre and found ${moodResults.length} matching songs. Now playing "${pick.title}" by ${pick.artist} (mood: ${pick.mood_tag || pick.genre}). Tell the user what you are playing and mention it matches the "${query}" vibe.]`;
        } else {
          // Step 3: Nothing found at all — fetch available moods/genres to guide the user
          const allSongs = await supabaseQuery(
            `/rest/v1/songs?select=mood_tag,genre&limit=100`,
          );
          const availableMoods = [...new Set(
            (allSongs || [])
              .flatMap(s => [s.mood_tag, s.genre])
              .filter(Boolean)
              .map(t => t.toLowerCase())
          )].sort();
          context = `[System: No song found by title or mood/genre matching "${query}". The library has these available moods and genres: ${availableMoods.join(", ")}. Tell the user their requested mood was not found, then LIST these available moods/genres and suggest they try one of them.]`;
        }
      }
    }
    // 1. List all/available songs
    else if (
      msgLower.includes("what songs do i have") ||
      msgLower.includes("list songs") ||
      msgLower.includes("my songs") ||
      msgLower.includes("available songs") ||
      msgLower.includes("what songs are")
    ) {
      const songs = await supabaseQuery(
        `/rest/v1/songs?select=title,artist,genre,mood_tag&limit=20`,
      );
      if (songs) {
        context = `[System: The user asked what songs they have. Here is a list of up to 20 songs currently available in the library: ${JSON.stringify(songs)}]`;
      }
    }
    // 2. Availability Check (Specific song)
    else if (
      msgLower.includes("available") ||
      (msgLower.includes("is ") && msgLower.includes(" in "))
    ) {
      // Rough extraction of title (can be improved by AI later if needed)
      let titleGuess = userMsg
        .replace(/is |available| in the library|\?|\'|\"/gi, "")
        .trim();
      const songs = await supabaseQuery(
        `/rest/v1/songs?title=ilike.*${encodeURIComponent(titleGuess)}*&select=title,artist,genre,mood_tag&limit=5`,
      );
      if (songs) {
        context = `[System: Supabase availability search results for title "${titleGuess}": ${JSON.stringify(songs)}]`;
      }
    }
    // 2. Playlist Creation
    else if (/create.*playlist|make.*playlist/i.test(msgLower)) {
      let playlistName = "My AI Playlist";
      let endpoint = `/rest/v1/songs?select=id,title,artist,genre,mood_tag&limit=10`; // default random

      if (msgLower.includes("random")) {
        playlistName = "Random AI Playlist";
      } else {
        // Try to extract a genre/mood keyword from the message
        // Patterns: "create a pop playlist", "make me a jazz playlist", "playlist of hip hop", "playlist for working out"
        const genreMatch =
          msgLower.match(/(?:create|make)(?:\s+me)?(?:\s+a(?:\s+\w+)?)??\s+(\w[\w\s-]*)\s+playlist/i) ||
          msgLower.match(/playlist\s+(?:of|for)\s+([\w\s-]+?)(?:\s*$)/i) ||
          msgLower.match(/for\s+([\w\s-]+?)(?:\s*$)/i);

        if (genreMatch) {
          let tag = genreMatch[1]
            .trim()
            .replace(/\bplaylist\b/gi, "")
            .replace(/\bme\b/gi, "")
            .replace(/\ba\b/gi, "")
            .trim();

          if (tag) {
            playlistName = tag.charAt(0).toUpperCase() + tag.slice(1) + " Playlist";
            // Search by BOTH genre AND mood_tag so genre-specific requests (e.g. "pop") return genre-matched songs
            endpoint = `/rest/v1/songs?or=(genre.ilike.*${encodeURIComponent(tag)}*,mood_tag.ilike.*${encodeURIComponent(tag)}*)&select=id,title,artist,genre,mood_tag&limit=10`;
          }
        }
      }

      // Get songs to add to playlist
      const songs = await supabaseQuery(endpoint);

      if (songs && songs.length > 0) {
        const playlistData = await supabaseQuery("/rest/v1/playlists", "POST", {
          name: playlistName,
          description: `AI generated playlist based on: ${userMsg}`,
        });

        if (playlistData && playlistData[0]) {
          const playlistId = playlistData[0].id;
          const playlistSongsPayload = songs.map((s, idx) => ({
            playlist_id: playlistId,
            song_id: s.id,
            order_index: idx,
          }));
          await supabaseQuery(
            "/rest/v1/playlist_songs",
            "POST",
            playlistSongsPayload,
          );
          window.dispatchEvent(new CustomEvent("playlistCreated"));
          const songListNames = songs
            .map((s) => `**${s.title}** by ${s.artist} (${s.genre || s.mood_tag})`)
            .join(", ");
          context = `[System: Successfully created playlist '${playlistName}' with ${songs.length} songs. These are the ONLY songs in the playlist — list them exactly as provided and do not add any others: ${songListNames}.]`;
        } else {
          context = `[System: Failed to create playlist in the database. Inform the user.]`;
        }
      } else {
        context = `[System: No songs matching the requested genre/mood were found in the library for playlist '${playlistName}'. Inform the user that no matching songs are available.]`;
      }
    }
    // 3. Vibe / Genre / Mood Search (Fallback)
    else {
      // Try to extract a genre if they mentioned "genre"
      let searchTag = "";
      const genreMatch =
        msgLower.match(/([a-z0-9\-]+)\s+genre/i) ||
        msgLower.match(/genre\s+([a-z0-9\-]+)/i);

      if (genreMatch) {
        searchTag = genreMatch[1].trim();
      } else {
        // Fallback to finding a descriptive word
        const ignoreWords = [
          "songs",
          "music",
          "with",
          "like",
          "that",
          "are",
          "about",
          "the",
          "some",
          "play",
          "show",
          "give",
          "me",
          "what",
        ];
        let words = msgLower
          .split(" ")
          .filter((w) => w.length > 2 && !ignoreWords.includes(w));
        searchTag = words[0] || "chill"; // take the first meaningful word, default to chill
      }

      // Search database for this tag in either genre OR mood_tag
      const endpoint = `/rest/v1/songs?or=(mood_tag.ilike.*${encodeURIComponent(searchTag)}*,genre.ilike.*${encodeURIComponent(searchTag)}*)&select=title,artist,genre,mood_tag&limit=10`;
      const songs = await supabaseQuery(endpoint);

      if (songs && songs.length > 0) {
        context = `[System: Supabase search results for genre/mood "${searchTag}": ${JSON.stringify(songs)}. ONLY list these exact songs if asked.]`;
      } else {
        context = `[System: The user asked for genre/mood "${searchTag}" but no songs were found in the database. Inform the user.]`;
      }
    }

    return context;
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue;
    setInputValue("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    let dbContext = null;

    try {
      // 1. Fetch relevant DB context (isolated — DB errors won't kill the whole request)
      try {
        dbContext = await detectIntentAndFetchContext(userMessage);
      } catch (dbErr) {
        console.error("DB context error:", dbErr);
        dbContext = "[System: Failed to query the music database. Answer based on general music knowledge only.]";
      }

      // 2. Prepare conversation
      let apiMessages = [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        {
          role: "user",
          content: userMessage + (dbContext ? `\n\n${dbContext}` : ""),
        },
      ];

      // 3. Call OpenRouter
      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            "HTTP-Referer": window.location.href,
            "X-Title": "Musika AI Chatbot",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "anthropic/claude-3.7-sonnet",
            messages: apiMessages,
            max_tokens: 500,
            stream: true,
          }),
        },
      );

      if (!response.ok) {
        // Read actual error body from OpenRouter for better diagnostics
        let errDetail = `Status ${response.status}`;
        try {
          const errBody = await response.json();
          errDetail = errBody?.error?.message || errBody?.message || errDetail;
        } catch {}
        throw new Error(`OpenRouter: ${errDetail}`);
      }

      // 4. Handle Streaming
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiResponse = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ") && line !== "data: [DONE]") {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.choices[0].delta.content) {
                aiResponse += data.choices[0].delta.content;
                setMessages((prev) => {
                  const newMsgs = [...prev];
                  const lastIndex = newMsgs.length - 1;
                  newMsgs[lastIndex] = { 
                    ...newMsgs[lastIndex], 
                    content: aiResponse 
                  };
                  return newMsgs;
                });
              }
            } catch (err) {
              // Ignore incomplete JSON chunks
            }
          }
        }
      }
    } catch (error) {
      console.error("Chatbot error:", error);
      const errMsg = error?.message || "";
      let userFriendly = "Sorry, something went wrong. Please try again.";
      if (errMsg.includes("402") || errMsg.toLowerCase().includes("credits") || errMsg.toLowerCase().includes("payment")) {
        userFriendly = "⚠️ OpenRouter API credits have run out. Please top up your OpenRouter account to continue using the AI.";
      } else if (errMsg.includes("401") || errMsg.toLowerCase().includes("auth") || errMsg.toLowerCase().includes("key")) {
        userFriendly = "⚠️ Invalid OpenRouter API key. Please check your `VITE_OPENROUTER_API_KEY` in `.env`.";
      } else if (errMsg.includes("429") || errMsg.toLowerCase().includes("rate limit")) {
        userFriendly = "⚠️ Rate limit hit. Please wait a moment and try again.";
      } else if (errMsg.includes("OpenRouter")) {
        userFriendly = `⚠️ AI error: ${errMsg.replace("OpenRouter: ", "")}`;
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: userFriendly },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion);
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        className="chatbot-toggle-btn shadow-lg"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="chatbot-window shadow-lg d-flex flex-column">
          <div className="chatbot-header d-flex justify-content-between align-items-center p-3">
            <h6 className="m-0 fw-bold d-flex align-items-center gap-2">
              <MessageSquare size={18} /> Musika AI
            </h6>
            <button
              className="btn btn-link text-white p-0"
              onClick={() => setIsOpen(false)}
            >
              <X size={20} />
            </button>
          </div>

          <div className="chatbot-suggestions d-flex gap-2 p-2 overflow-auto">
            <span
              className="badge chatbot-badge"
              onClick={() => handleSuggestionClick("🌙 Late night drive")}
            >
              🌙 Late night drive
            </span>
            <span
              className="badge chatbot-badge"
              onClick={() => handleSuggestionClick("💪 Workout songs")}
            >
              💪 Workout songs
            </span>
            <span
              className="badge chatbot-badge"
              onClick={() => handleSuggestionClick("➕ Create a playlist")}
            >
              ➕ Create a playlist
            </span>
            <span
              className="badge chatbot-badge"
              onClick={() => handleSuggestionClick("🔍 Check a song")}
            >
              🔍 Check a song
            </span>
          </div>

          <div className="chatbot-messages flex-grow-1 p-3 overflow-auto">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`d-flex mb-3 ${msg.role === "user" ? "justify-content-end" : "justify-content-start"}`}
              >
                <div
                  className={`chatbot-bubble ${msg.role === "user" ? "user-bubble" : "ai-bubble"}`}
                >
                  {msg.role === "assistant" ? (
                    <div className="markdown-content">
                      <ReactMarkdown>
                        {msg.content || ""}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="d-flex mb-3 justify-content-start">
                <div className="chatbot-bubble ai-bubble d-flex gap-1 align-items-center">
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form
            onSubmit={sendMessage}
            className="chatbot-input p-3 d-flex gap-2 border-top"
          >
            <input
              type="text"
              className="form-control chatbot-text-input"
              placeholder="Ask for a vibe..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isLoading}
            />
            <button
              type="submit"
              className="btn chatbot-send-btn d-flex align-items-center justify-content-center"
              disabled={isLoading || !inputValue.trim()}
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default Chatbot;
