/**
 * MessageList — renders the chat messages with streaming support,
 * hover action toolbar, and full Markdown rendering with syntax highlighting.
 */

import { useState, useEffect, useRef, useCallback, type HTMLAttributes, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { ChatMessage } from '../types';

interface MessageListProps {
  messages: ChatMessage[];
  isStreaming?: boolean;
  onRegenerate?: (messageId: string) => void;
  onEditAndRegenerate?: (messageId: string, newContent: string) => void;
  onCopy?: (content: string) => void;
  onDelete?: (messageId: string) => void;
}

export default function MessageList({ messages, isStreaming, onRegenerate, onEditAndRegenerate, onCopy, onDelete }: MessageListProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const userScrolledUp = useRef(false);

  // Track whether user has scrolled up
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    userScrolledUp.current = distanceFromBottom > 80;
  }, []);

  // Auto-scroll to bottom on new messages (unless user scrolled up)
  const lastMessageContent = messages[messages.length - 1]?.content;
  useEffect(() => {
    if (!userScrolledUp.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, lastMessageContent]);

  // Show typing indicator when streaming and last assistant message is empty
  const lastMsg = messages[messages.length - 1];
  const showTypingIndicator = isStreaming && lastMsg?.role === 'assistant' && !lastMsg.content;

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="h-full overflow-y-auto px-3 sm:px-4 pt-6 pb-6 space-y-4"
    >
      {messages.map((msg) => {
        // Skip empty partial messages — the skeleton indicator handles that
        if (msg.isPartial && !msg.content) return null;
        return (
          <MessageBubble
            key={msg.id}
            message={msg}
            onRegenerate={onRegenerate}
            onEditAndRegenerate={onEditAndRegenerate}
            onCopy={onCopy}
            onDelete={onDelete}
          />
        );
      })}

      {/* Typing / loading indicator */}
      {showTypingIndicator && (
        <div className="flex justify-start animate-fade-in">
            <div className="bg-card border border-border rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 shadow-sm max-w-[92%] sm:max-w-[80%]">
            {/* Skeleton lines */}
            <div className="space-y-2.5 mb-2">
              <div className="h-3 bg-muted rounded-full w-48 animate-pulse" />
              <div className="h-3 bg-muted rounded-full w-36 animate-pulse" style={{ animationDelay: '100ms' }} />
              <div className="h-3 bg-muted rounded-full w-52 animate-pulse" style={{ animationDelay: '200ms' }} />
            </div>
            {/* Bouncing dots */}
            <div className="flex items-center gap-1.5 pt-1">
              <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

/* ── Code block component with syntax highlighting + copy ─────── */
function CodeBlock({ className, children, ...props }: HTMLAttributes<HTMLElement> & { children?: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const code = String(children).replace(/\n$/, '');

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (match) {
    return (
      <div className="relative group/code my-3 max-w-full overflow-hidden">
        <div className="flex items-center justify-between bg-[#282c34] rounded-t-lg px-3 sm:px-4 py-1.5 text-xs text-muted-foreground border-b border-white/10">
          <span>{match[1]}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            {copied ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Copied
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                Copy
              </>
            )}
          </button>
        </div>
        <SyntaxHighlighter
          style={oneDark}
          language={match[1]}
          PreTag="div"
          customStyle={{ margin: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0, borderBottomLeftRadius: '0.5rem', borderBottomRightRadius: '0.5rem' }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    );
  }

  // Inline code
  return (
    <code className="bg-muted text-foreground px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
      {children}
    </code>
  );
}

/* ── MessageBubble ────────────────────────────────────────────── */
function MessageBubble({
  message,
  onRegenerate,
  onEditAndRegenerate,
  onCopy,
  onDelete,
}: {
  message: ChatMessage;
  onRegenerate?: (messageId: string) => void;
  onEditAndRegenerate?: (messageId: string, newContent: string) => void;
  onCopy?: (content: string) => void;
  onDelete?: (messageId: string) => void;
}) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);
  const editRef = useRef<HTMLTextAreaElement>(null);
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchMoved = useRef(false);

  useEffect(() => {
    if (editing && editRef.current) {
      editRef.current.focus();
      editRef.current.style.height = 'auto';
      editRef.current.style.height = editRef.current.scrollHeight + 'px';
    }
  }, [editing]);

  // Cleanup long-press timer
  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);

  // Long-press handlers for mobile action overlay
  const handleTouchStart = useCallback(() => {
    touchMoved.current = false;
    longPressTimer.current = setTimeout(() => {
      if (!touchMoved.current) {
        setMobileActionsOpen(true);
        if (navigator.vibrate) navigator.vibrate(30);
      }
    }, 500);
  }, []);

  const handleTouchMove = useCallback(() => {
    touchMoved.current = true;
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
          System: {message.content.slice(0, 100)}
        </div>
      </div>
    );
  }

  const handleCopy = () => {
    if (onCopy) {
      onCopy(message.content);
    } else {
      navigator.clipboard.writeText(message.content);
    }
  };

  const handleEditSubmit = () => {
    const trimmed = editText.trim();
    if (trimmed && onEditAndRegenerate) {
      onEditAndRegenerate(message.id, trimmed);
    }
    setEditing(false);
  };

  return (
    <div className={`group flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className="relative max-w-[92%] sm:max-w-[80%] min-w-0"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onContextMenu={(e) => { if ('ontouchstart' in window) e.preventDefault(); }}
      >
        {/* Hover action toolbar — desktop only */}
        {!message.isPartial && (
          <div className={`absolute -top-8 ${isUser ? 'right-0' : 'left-0'} hidden sm:block opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10`}>
            <div className="flex items-center gap-0.5 bg-popover border border-border rounded-lg shadow-lg px-1 py-0.5">
              {/* Copy */}
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                title="Copy message"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>

              {/* Edit (user messages only) */}
              {isUser && onEditAndRegenerate && (
                <button
                  onClick={() => { setEditText(message.content); setEditing(true); }}
                  className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                  title="Edit & regenerate"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}

              {/* Regenerate (assistant messages only) */}
              {!isUser && onRegenerate && (
                <button
                  onClick={() => onRegenerate(message.id)}
                  className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                  title="Regenerate response"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              )}

              {/* Delete */}
              {onDelete && (
                <button
                  onClick={() => onDelete(message.id)}
                  className="p-1.5 rounded-md hover:bg-destructive/20 transition-colors text-muted-foreground hover:text-destructive"
                  title="Delete message"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Message bubble */}
        <div
          className={`rounded-lg px-3 py-2.5 sm:px-4 sm:py-3 shadow-sm overflow-hidden ${
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-card border border-border text-card-foreground'
          } ${message.isError ? 'border-destructive bg-destructive/10' : ''}`}
        >
          {/* Attachments */}
          {message.attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {message.attachments.map((att) => (
                <div key={att.id} className="inline-block">
                  {att.type === 'image' ? (
                    <img
                      src={att.dataUrl}
                      alt={att.name}
                      className={`rounded-md object-contain ${
                        isUser ? 'max-w-[160px] max-h-[120px] sm:max-w-[200px] sm:max-h-[150px]' : 'max-w-full max-h-[400px] sm:max-h-[500px] w-auto'
                      }`}
                    />
                  ) : att.type === 'audio' ? (
                    <audio controls src={att.dataUrl} className="max-w-full w-full sm:min-w-[280px]" />
                  ) : att.type === 'video' ? (
                    <video controls src={att.dataUrl} className={`rounded-md ${
                      isUser ? 'max-w-[200px] sm:max-w-[250px]' : 'max-w-full max-h-[400px] sm:max-h-[500px] w-auto'
                    }`} />
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {att.name}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Content — editing mode for user messages */}
          {editing ? (
            <div className="space-y-2">
              <textarea
                ref={editRef}
                value={editText}
                onChange={(e) => {
                  setEditText(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditSubmit(); }
                  if (e.key === 'Escape') setEditing(false);
                }}
                className="w-full bg-secondary text-foreground rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                rows={1}
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setEditing(false)} className="px-3 py-1 text-xs rounded-md hover:bg-accent text-muted-foreground">
                  Cancel
                </button>
                <button onClick={handleEditSubmit} className="px-3 py-1 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90">
                  Save & Submit
                </button>
              </div>
            </div>
          ) : (
            /* Content — rendered as markdown for assistant, plain for user */
            <div className={`${isUser ? 'text-sm whitespace-pre-wrap' : 'prose-chat'} ${message.isPartial && !isUser ? 'streaming-fade-in' : ''}`}>
              {isUser ? (
                message.content
              ) : (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code: CodeBlock,
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              )}
            </div>
          )}

          {/* Streaming indicator */}
          {message.isPartial && (
            <span className="inline-block w-2 h-4 bg-muted-foreground animate-pulse ml-1 rounded-sm" />
          )}

          {/* Metadata */}
          <div className={`flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-0.5 mt-1.5 sm:mt-2 text-[11px] sm:text-xs ${isUser ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
            <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
            {message.model && <span>· {message.model}</span>}
            {message.tokensUsed !== undefined && (
              <span>· {message.tokensUsed} tokens</span>
            )}
            {message.pollenSpent !== undefined && message.pollenSpent > 0 && (
              <span>· {message.pollenSpent.toFixed(5)} pollen</span>
            )}
          </div>
        </div>

        {/* Mobile long-press action overlay */}
        {mobileActionsOpen && (
          <div
            className="fixed inset-0 z-50 sm:hidden animate-fade-in"
            onClick={() => setMobileActionsOpen(false)}
            style={{ touchAction: 'none' }}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div
              className="relative z-10 flex flex-col items-center justify-center h-full px-5"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Popped message preview */}
              <div className={`w-full max-w-sm rounded-xl px-4 py-3 shadow-2xl ring-1 ring-white/10 ${
                isUser ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-card-foreground'
              }`}>
                <p className="text-sm whitespace-pre-wrap line-clamp-8">{message.content}</p>
                {message.attachments.length > 0 && (
                  <p className="text-xs mt-1 opacity-60">{message.attachments.length} attachment(s)</p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
                <button
                  onClick={() => { handleCopy(); setMobileActionsOpen(false); }}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-card border border-border rounded-full text-sm text-foreground active:bg-accent transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  Copy
                </button>
                {isUser && onEditAndRegenerate && (
                  <button
                    onClick={() => { setEditText(message.content); setEditing(true); setMobileActionsOpen(false); }}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-card border border-border rounded-full text-sm text-foreground active:bg-accent transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    Edit
                  </button>
                )}
                {!isUser && onRegenerate && (
                  <button
                    onClick={() => { onRegenerate(message.id); setMobileActionsOpen(false); }}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-card border border-border rounded-full text-sm text-foreground active:bg-accent transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    Retry
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => { onDelete(message.id); setMobileActionsOpen(false); }}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-destructive/10 border border-destructive/30 rounded-full text-sm text-destructive active:bg-destructive/20 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    Delete
                  </button>
                )}
              </div>
              <p className="text-center text-xs text-muted-foreground/60 mt-4">Tap anywhere to dismiss</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
