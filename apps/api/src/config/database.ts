import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@beatbound/database';

const connectionString = process.env.DATABASE_URL!;

// Connection for queries
const queryClient = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
});

export const db = drizzle(queryClient, { schema });

// Health check function
export async function checkDatabaseConnection(): Promise<boolean> {
    try {
        await queryClient`SELECT 1`;
        return true;
    } catch (error) {
        return false;
    }
}
