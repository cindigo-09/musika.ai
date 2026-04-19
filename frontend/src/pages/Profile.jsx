import React from 'react';
import Sidebar from '../components/Sidebar';
import ProfileSection from '../components/ProfileSection';
import SecuritySection from '../components/SecuritySection';
import 'bootstrap/dist/css/bootstrap.min.css';
import Header from '../components/Header';

function Profile() {
    return (
        <div className="d-flex flex-column vh-100 vw-100 text-white overflow-hidden" style={{ background: "#050508" }}>
            <Header />
            <div className="container-fluid p-0  text-light min-vh-screen d-flex">
                <Sidebar />

                <main className="flex-grow-1 vh-100 overflow-auto" style={{ backgroundColor: '#050508' }}>

                    <div className="container py-5 px-md-5" style={{ maxWidth: '1100px' }}>
                        <header className="mb-5">
                            <h2 className="display-4 fw-bold tracking-tighter mb-2 font-headline">Profile Settings</h2>
                            <p className="text-secondary fw-light" style={{ maxWidth: '600px' }}>
                                Configure your presence in the Musika AI ecosystem. Adjust your digital identity and technical parameters below.
                            </p>
                        </header>

                        <div className="row g-5">
                            <div className="col-lg-7">
                                <ProfileSection />
                            </div>
                            <div className="col-lg-5">
                                <SecuritySection />
                            </div>
                        </div>
                    </div>

                </main>
            </div>
        </div>
    );
};

export default Profile;