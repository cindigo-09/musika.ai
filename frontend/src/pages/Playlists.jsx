import React from 'react'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'

function Playlists() {
    return (
        <div className="d-flex flex-column vh-100 vw-100 text-white overflow-hidden" style={{ background: "#050508" }}>
            <Header />
            <div className="container-fluid p-0  text-light min-vh-screen d-flex">
                <Sidebar />

                <main className="flex-grow-1 vh-100 overflow-auto" style={{ backgroundColor: '#050508' }}>



                </main>
            </div>
        </div>
    )
}

export default Playlists