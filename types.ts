
export interface User {
  id: string;
  name: string;
  email: string;
  picture: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  image?: {
    data: string;
    mimeType: string;
  };
  file?: {
    name: string;
    data: string;
    mimeType: string;
    size: number;
  };
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

export interface ChatState {
  user: User | null;
  sessions: ChatSession[];
  activeSessionId: string;
  isLoading: boolean;
  error: string | null;
}
