export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-background">
            <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 space-y-6">
                <h1 className="text-3xl font-bold text-foreground">Privacy Policy</h1>
                <p className="text-muted-foreground">
                    BeatBound collects account, profile, and usage data required to provide the service, including
                    authentication, submissions, votes, and challenge participation.
                </p>
                <p className="text-muted-foreground">
                    We use this data to operate the platform, detect abuse, and improve reliability. We do not sell your
                    personal data.
                </p>
                <p className="text-muted-foreground">
                    You can request account and data deletion by contacting support.
                </p>
            </div>
        </div>
    );
}
