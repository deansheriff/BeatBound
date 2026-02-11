export default function SupportPage() {
    return (
        <div className="min-h-screen bg-background">
            <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 space-y-6">
                <h1 className="text-3xl font-bold text-foreground">Support</h1>
                <p className="text-muted-foreground">
                    Need help with your account, submissions, payments, or moderation?
                </p>
                <div className="glass-card p-6 space-y-3">
                    <p className="text-foreground">
                        Contact: <a className="text-primary-400 hover:text-primary-300" href="mailto:support@sherpackage.com">support@sherpackage.com</a>
                    </p>
                    <p className="text-muted-foreground text-sm">
                        Include your username, challenge/submission ID (if relevant), and a short description of the issue.
                    </p>
                </div>
            </div>
        </div>
    );
}
