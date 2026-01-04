'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileAudio, FileVideo, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

interface FileUploaderProps {
    accept: Record<string, string[]>;
    maxSize?: number;
    onFileSelect: (file: File) => void;
    label?: string;
    description?: string;
    error?: string;
    file?: File | null;
    onClear?: () => void;
    isLoading?: boolean;
}

export default function FileUploader({
    accept,
    maxSize = 100 * 1024 * 1024, // 100MB default
    onFileSelect,
    label = 'Upload File',
    description = 'Drag & drop or click to upload',
    error,
    file,
    onClear,
    isLoading = false,
}: FileUploaderProps) {
    const onDrop = useCallback(
        (acceptedFiles: File[]) => {
            if (acceptedFiles.length > 0) {
                onFileSelect(acceptedFiles[0]);
            }
        },
        [onFileSelect]
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept,
        maxSize,
        multiple: false,
        disabled: isLoading || !!file,
    });

    const getIcon = () => {
        if (file) {
            return file.type.startsWith('audio/') ? (
                <FileAudio className="w-8 h-8 text-brand-400" />
            ) : (
                <FileVideo className="w-8 h-8 text-accent-400" />
            );
        }
        return <Upload className="w-8 h-8 text-surface-400" />;
    };

    return (
        <div className="w-full">
            {file ? (
                <div className="relative overflow-hidden rounded-xl border border-surface-700 bg-surface-900/50 p-4 transition-all">
                    <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 p-3 rounded-lg bg-surface-800">
                            {getIcon()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{file.name}</p>
                            <p className="text-sm text-surface-400">
                                {(file.size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                        </div>
                        {!isLoading && onClear && (
                            <button
                                onClick={onClear}
                                className="p-2 hover:bg-surface-800 rounded-full transition-colors text-surface-400 hover:text-red-400"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                        {isLoading && (
                            <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                        )}
                    </div>
                    {/* Progress bar could go here if we tracked upload progress in this component */}
                </div>
            ) : (
                <div
                    {...getRootProps()}
                    className={cn(
                        'relative overflow-hidden rounded-xl border-2 border-dashed border-surface-700 bg-surface-900/20 p-8 text-center transition-all cursor-pointer',
                        isDragActive ? 'border-brand-500 bg-brand-500/5' : 'hover:border-surface-600 hover:bg-surface-900/40',
                        error ? 'border-red-500/50 bg-red-500/5' : '',
                        isLoading ? 'opacity-50 cursor-not-allowed' : ''
                    )}
                >
                    <input {...getInputProps()} />
                    <div className="flex flex-col items-center gap-3">
                        <div className="p-4 rounded-full bg-surface-800/50">
                            <Upload className={cn("w-6 h-6", error ? 'text-red-400' : 'text-surface-400')} />
                        </div>
                        <div>
                            <p className="font-medium text-lg">{label}</p>
                            <p className="text-sm text-surface-400">{description}</p>
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div className="mt-2 flex items-center gap-2 text-sm text-red-400">
                    <AlertCircle className="w-4 h-4" />
                    <span>{error}</span>
                </div>
            )}
        </div>
    );
}
