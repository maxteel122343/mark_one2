import { supabase } from './supabase';
import { CardData, Connection } from '../types';

export const persistenceService = {
    async fetchCards(userId: string): Promise<CardData[]> {
        const { data, error } = await supabase
            .from('cards')
            .select('*')
            .eq('user_id', userId);

        if (error) throw error;

        return data.map(row => ({
            ...row.data,
            id: row.id,
            title: row.title,
            description: row.description,
            type: row.type || 'task',
            x: row.x,
            y: row.y,
            color: row.color,
        })) as CardData[];
    },

    async fetchConnections(userId: string): Promise<Connection[]> {
        const { data, error } = await supabase
            .from('connections')
            .select('*')
            .eq('user_id', userId);

        if (error) throw error;
        return data as Connection[];
    },

    async saveCard(userId: string, card: CardData) {
        const { id, title, description, type, x, y, color, ...rest } = card;
        const { error } = await supabase
            .from('cards')
            .upsert({
                id,
                user_id: userId,
                title,
                description,
                type: type || 'task',
                x,
                y,
                color,
                data: rest,
                updated_at: new Date().toISOString()
            });

        if (error) throw error;
    },

    async deleteCard(id: string) {
        const { error } = await supabase
            .from('cards')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async saveConnection(userId: string, conn: Connection) {
        const { error } = await supabase
            .from('connections')
            .upsert({
                ...conn,
                user_id: userId,
                updated_at: new Date().toISOString()
            });

        if (error) throw error;
    },

    async deleteConnection(id: string) {
        const { error } = await supabase
            .from('connections')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async saveProfile(userId: string, settings: any) {
        const { error } = await supabase
            .from('profiles')
            .upsert({
                id: userId,
                settings,
                updated_at: new Date().toISOString()
            });
        if (error) throw error;
    },

    async fetchProfile(userId: string) {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    },

    async createBackup(userId: string, cards: CardData[], connections: Connection[], backupName: string) {
        const backupData = {
            cards,
            connections,
            version: '1.0',
            timestamp: Date.now()
        };

        const fileName = `${userId}/${Date.now()}_backup.json`;
        const { error } = await supabase.storage
            .from('backups')
            .upload(fileName, JSON.stringify(backupData), {
                contentType: 'application/json',
                upsert: true
            });

        if (error) throw error;
        return fileName;
    },

    async restoreBackup(filePath: string) {
        const { data, error } = await supabase.storage
            .from('backups')
            .download(filePath);

        if (error) throw error;
        const text = await data.text();
        return JSON.parse(text);
    },

    async clearAllData(userId: string) {
        const { error: cardsError } = await supabase
            .from('cards')
            .delete()
            .eq('user_id', userId);

        const { error: connsError } = await supabase
            .from('connections')
            .delete()
            .eq('user_id', userId);

        if (cardsError) throw cardsError;
        if (connsError) throw connsError;
    }
};
