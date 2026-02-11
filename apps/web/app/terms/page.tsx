export default function TermsPage() {
    return (
        <div className="min-h-screen bg-background">
            <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 space-y-6">
                <h1 className="text-3xl font-bold text-foreground">Terms of Service</h1>
                <p className="text-muted-foreground">
                    By using BeatBound, you agree to follow platform rules, copyright requirements, and community
                    standards. You are responsible for the content you upload and for ensuring you have rights to use
                    all audio, video, and images in your submissions.
                </p>
                <p className="text-muted-foreground">
                    BeatBound may suspend or remove accounts and content that violate these terms, including abuse,
                    fraud, harassment, or infringement.
                </p>
                <p className="text-muted-foreground">
                    For legal requests, contact support through the support page.
                </p>
            </div>
        </div>
    );
}
