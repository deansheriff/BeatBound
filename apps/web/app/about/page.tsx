export default function AboutPage() {
    return (
        <div className="min-h-screen bg-background">
            <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 space-y-6">
                <h1 className="text-3xl font-bold text-foreground">About BeatBound</h1>
                <p className="text-muted-foreground">
                    BeatBound is a music competition platform where producers create beat challenges and artists submit
                    video performances. The community votes, rankings update in real time, and winners earn recognition
                    and rewards.
                </p>
                <p className="text-muted-foreground">
                    Our mission is to make music discovery merit-based and transparent, while giving creators a reliable
                    way to collaborate, compete, and grow their audience.
                </p>
            </div>
        </div>
    );
}
