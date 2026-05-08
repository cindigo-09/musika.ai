import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send } from "lucide-react";
import { useMusic } from "../context/MusicContext";
import { supabase } from "../supabaseClient";

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const SYSTEM_PROMPT = `
You are a smart and friendly music library assistant connected to a real Supabase music database.

You help users with three things:
1. Finding songs by vibe or mood
2. Creating playlists by mood or genre
3. Checking if a song is available in the library
4. Playing songs instantly when asked

MOOD MAPPING GUIDE — translate user vibes into mood_tag values:
- late night drive → chill, melancholic, atmospheric, nocturnal, mellow, dreamy
- working out / gym → energetic, hype, aggressive, motivational, upbeat
- sad / heartbreak → melancholic, emotional, slow, heartbreak, ballad
- party / hype → upbeat, danceable, fun, energetic, hype
- focus / study → lofi, instrumental, calm, ambient, focus
- happy / good mood → happy, cheerful, upbeat, fun, positive
- romantic / date night → romantic, love, smooth, slow, R&B

BEHAVIOR RULES:
- Never fabricate songs. Only respond based on data retrieved from Supabase.
- When a user asks for songs by vibe, tell the app to query songs by mood_tag.
- When a user asks to create a playlist, tell the app to create one in Supabase.
- When a user asks if a song is available, tell the app to search by title.
- Always be warm, conversational, and enthusiastic like a music curator.
- Format song results as a numbered list: Title — Artist (Genre · Mood)
- If the system tells you it played a song, enthusiastically confirm it's now playing.
- NEVER invent, hallucinate, or suggest songs that are not provided to you in the [System] context. Only talk about or list the exact songs provided.
- If no results found, say so honestly and suggest trying a different vibe.
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

    // 0. Play Song
    if (msgLower.startsWith("play ") || msgLower.includes("play me ")) {
      let titleGuess = msgLower.replace(/play |play me /gi, "").trim();
      const songs = await supabaseQuery(
        `/rest/v1/songs?title=ilike.*${encodeURIComponent(titleGuess)}*&select=id,title,artist,genre,mood_tag,song_url&limit=1`,
      );
      if (songs && songs.length > 0) {
        const songToPlay = songs[0];
        playSong(songToPlay);
        context = `[System: Successfully found and automatically started playing the song "${songToPlay.title}" by ${songToPlay.artist}. Tell the user you are playing it now.]`;
      } else {
        context = `[System: Tried to play "${titleGuess}" but it was not found in the database. Tell the user it's unavailable.]`;
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
      // Look for mood or name
      let playlistName = "My AI Playlist";
      let endpoint = "/rest/v1/songs?limit=10"; // default random

      const moodMatch =
        msgLower.match(/for (.*?)$/i) ||
        msgLower.match(/called (.*?)$/i) ||
        msgLower.match(/of (.*?)$/i);

      if (msgLower.includes("random")) {
        playlistName = "Random AI Playlist";
        // Random ordering can be simulated or we just take the first 10
      } else if (moodMatch) {
        let mood = moodMatch[1]
          .trim()
          .replace(/playlist/gi, "")
          .trim();
        if (mood) {
          playlistName =
            mood.charAt(0).toUpperCase() + mood.slice(1) + " Playlist";
          endpoint = `/rest/v1/songs?mood_tag=ilike.*${encodeURIComponent(mood)}*&limit=10`;
        }
      }

      // Get songs to add to playlist
      const songs = await supabaseQuery(endpoint);

      if (songs && songs.length > 0) {
        // Create Playlist
        // NOTE: hardcoding a UUID for user_id to bypass auth requirements for this example,
        // or just letting Supabase fail if user_id is required. Assuming user_id can be null or we pass a generic one.
        // We'll just create it without user_id if the schema allows, or use a dummy UUID.
        // If your schema requires user_id, make sure to pass the actual logged in user's ID.
        const playlistData = await supabaseQuery("/rest/v1/playlists", "POST", {
          name: playlistName,
          description: `AI generated playlist based on: ${userMsg}`,
        });

        if (playlistData && playlistData[0]) {
          const playlistId = playlistData[0].id;
          // Add songs
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
            .map((s) => `${s.title} by ${s.artist}`)
            .join(", ");
          context = `[System: Successfully created playlist '${playlistName}' and added ${songs.length} songs. Here are the EXACT songs added: ${songListNames}. YOU MUST ONLY LIST THESE EXACT SONGS IN YOUR RESPONSE AND NO OTHERS.]`;
        } else {
          context = `[System: Failed to create playlist. Provide a general recommendation instead.]`;
        }
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

    try {
      // 1. Fetch relevant DB context
      const dbContext = await detectIntentAndFetchContext(userMessage);

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
            "HTTP-Referer": window.location.href, // Optional
            "X-Title": "Musika AI Chatbot", // Optional
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "anthropic/claude-3.7-sonnet", // Updated to the latest sonnet model available on OpenRouter
            messages: apiMessages,
            max_tokens: 500, // Added to prevent credit limit errors (402) on OpenRouter
            stream: true,
          }),
        },
      );

      if (!response.ok) throw new Error("API Error");

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
                  newMsgs[newMsgs.length - 1].content = aiResponse;
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
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I ran into an error connecting to the music database or AI provider.",
        },
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
                  {msg.content}
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
