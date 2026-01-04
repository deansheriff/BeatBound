import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatCurrency(amount: string | number | null | undefined) {
    if (!amount) return '$0';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(num);
}

export function formatDate(date: string | Date) {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(new Date(date));
}

export function formatRelativeTime(date: string | Date) {
    const now = new Date();
    const then = new Date(date);
    const diffMs = then.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return 'Ended';
    } else if (diffDays === 0) {
        return 'Ends today';
    } else if (diffDays === 1) {
        return 'Ends tomorrow';
    } else if (diffDays < 7) {
        return `${diffDays} days left`;
    } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return `${weeks} week${weeks > 1 ? 's' : ''} left`;
    } else {
        return formatDate(date);
    }
}

export function formatVoteCount(count: number) {
    if (count >= 1000000) {
        return (count / 1000000).toFixed(1) + 'M';
    } else if (count >= 1000) {
        return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
}

export function getInitials(name: string | null | undefined) {
    if (!name) return '?';
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

export function isVideoFile(file: File) {
    return file.type.startsWith('video/');
}

export function isAudioFile(file: File) {
    return file.type.startsWith('audio/');
}
