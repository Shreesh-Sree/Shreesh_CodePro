import { useState } from 'react';
import { Bell, Info, CheckCircle, Warning, XCircle } from '@phosphor-icons/react';

// Mock logs data
const MOCK_LOGS = [
    { id: 1, type: 'info', message: 'System update completed successfully.', time: '2 mins ago' },
    { id: 2, type: 'success', message: 'New deployment triggers for staging.', time: '1 hour ago' },
    { id: 3, type: 'warning', message: 'High memory usage detected on node-2.', time: '3 hours ago' },
    { id: 4, type: 'error', message: 'Failed to sync with external API.', time: '5 hours ago' },
    { id: 5, type: 'info', message: 'User admin@codepro.com logged in.', time: '1 day ago' },
];

export default function Notifications() {
    const [logs] = useState(MOCK_LOGS);

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle className="h-5 w-5 text-emerald-500" />;
            case 'warning': return <Warning className="h-5 w-5 text-amber-500" />;
            case 'error': return <XCircle className="h-5 w-5 text-red-500" />;
            default: return <Info className="h-5 w-5 text-blue-500" />;
        }
    };

    return (
        <div className="page-container max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Bell className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <h1 className="text-2xl font-medium tracking-tight text-foreground" style={{ fontFamily: 'var(--font-serif)' }}>
                        Notifications & Logs
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">System events and application activity.</p>
                </div>
            </div>

            <div className="neo-card p-0 overflow-hidden">
                <div className="border-b bg-muted/30 px-6 py-4">
                    <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Recent Activity Logs</h3>
                </div>
                <div className="divide-y divide-border">
                    {logs.map((log) => (
                        <div key={log.id} className="flex items-start gap-4 p-4 hover:bg-muted/30 transition-colors">
                            <div className="mt-0.5 shrink-0">
                                {getIcon(log.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground">{log.message}</p>
                                <p className="text-xs text-muted-foreground mt-0.5 uppercase tracking-wide">{log.type}</p>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">{log.time}</span>
                        </div>
                    ))}
                </div>
                <div className="p-4 bg-muted/10 text-center">
                    <button className="text-xs font-medium text-primary hover:underline">View All Logs</button>
                </div>
            </div>
        </div>
    );
}
