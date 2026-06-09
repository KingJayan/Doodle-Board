import { Injectable } from '@angular/core';
import { supabase } from './supabase.provider';

@Injectable({ providedIn: 'root' })
export class AiService {
  readonly isAvailable = !!supabase;

  async brainstormCard(topic: string): Promise<{ title: string; content: string; tags: string[] }> {
    if (!supabase) return { title: 'No AI', content: 'Cloud sync required for AI features.', tags: ['ai-disabled'] };
    const { data, error } = await supabase.functions.invoke('ai-proxy', { body: { action: 'brainstorm', topic } });
    if (error) throw error;
    return data;
  }

  async polishText(text: string, mode: 'fix' | 'expand' | 'tone'): Promise<string> {
    if (!supabase) throw new Error('AI not available');
    const { data, error } = await supabase.functions.invoke('ai-proxy', { body: { action: 'polish', text, mode } });
    if (error) throw error;
    return data.text ?? text;
  }
}
