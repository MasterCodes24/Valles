import React, { useEffect, useState } from 'react'
import { getEarthCommsLog, sendEarthComm } from '../api/mockApi'
import { PageHeader } from '../components/ui/SharedComponents'
import { Radio, Send, Clock, ChevronRight, Inbox } from 'lucide-react'
import './EarthCommsPage.css'

export default function EarthCommsPage() {
  const [messages, setMessages] = useState([])
  const [selected, setSelected] = useState(null)
  const [composing, setComposing] = useState(false)
  const [draft, setDraft] = useState({ subject: '', body: '' })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(null)

  useEffect(() => {
    getEarthCommsLog('mock-uid-001').then(msgs => {
      setMessages(msgs)
      setSelected(msgs[0])
    })
  }, [])

  const handleSend = async () => {
    setSending(true)
    const result = await sendEarthComm('mock-uid-001', draft)
    setSent(result)
    setSending(false)
    setComposing(false)
    setDraft({ subject: '', body: '' })
  }

  const priorityColor = (p) => p === 'high' ? 'var(--clr-hazard)' : 'var(--clr-text-muted)'

  return (
    <div className="comms-page animate-fadeIn">
      <PageHeader
        title="Earth Communications"
        subtitle="Signal delay: ~142 minutes each way"
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => setComposing(true)}>
            <Send size={14} /> Compose Transmission
          </button>
        }
      />

      <div className="comms-layout">
        {/* Message List */}
        <div className="comms-list glass-bright">
          <div style={{ padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--clr-border)' }}>
            <div className="label">INBOX</div>
          </div>
          <div className="scroll-area" style={{ maxHeight: 480 }}>
            {messages.map(msg => (
              <div
                key={msg.id}
                id={`comms-msg-${msg.id}`}
                className={`comms-list-item ${selected?.id === msg.id ? 'active' : ''} ${!msg.read ? 'unread' : ''}`}
                onClick={() => setSelected(msg)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <span className="msg-from">{msg.from}</span>
                  {msg.priority === 'high' && (
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-hazard)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>PRIORITY</span>
                  )}
                </div>
                <div className="msg-subject">{msg.subject}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={10} /> {new Date(msg.receivedAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Message View */}
        <div className="comms-view glass-bright">
          {composing ? (
            <div className="compose-panel">
              <div className="compose-header">
                <Radio size={18} style={{ color: 'var(--clr-ice-300)' }} />
                <h4>New Transmission to JPL Mission Control</h4>
              </div>
              <div className="transmission-delay">
                <Clock size={12} />
                <span>Estimated delivery: ~142 min · Reply: ~4h 44min</span>
              </div>
              <div className="form-group">
                <label className="label">Subject</label>
                <input className="input" placeholder="Transmission subject..." value={draft.subject} onChange={e => setDraft(d => ({ ...d, subject: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="label">Message</label>
                <textarea
                  className="input"
                  rows={8}
                  placeholder="Write your transmission..."
                  value={draft.body}
                  onChange={e => setDraft(d => ({ ...d, body: e.target.value }))}
                  style={{ resize: 'vertical', lineHeight: 1.7 }}
                />
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <button id="send-transmission-btn" className="btn btn-primary" onClick={handleSend} disabled={sending || !draft.subject || !draft.body}>
                  {sending ? <><div className="btn-spinner" />Transmitting...</> : <><Send size={16} />Send Transmission</>}
                </button>
                <button className="btn btn-ghost" onClick={() => setComposing(false)}>Cancel</button>
              </div>
              {sent && (
                <div className="alert alert-safe" style={{ marginTop: 'var(--space-4)' }}>
                  <Radio size={16} />
                  Transmission sent! Expected reply in ~{Math.round(sent.estimatedReplyMins / 60)}h {sent.estimatedReplyMins % 60}min.
                </div>
              )}
            </div>
          ) : selected ? (
            <div className="message-view">
              <div className="msg-view-header">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                    {selected.priority === 'high' && (
                      <span className="badge badge-hazard">PRIORITY</span>
                    )}
                  </div>
                  <h3 style={{ marginBottom: 'var(--space-2)' }}>{selected.subject}</h3>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-muted)', display: 'flex', gap: 'var(--space-4)', fontFamily: 'var(--font-mono)' }}>
                    <span>FROM: {selected.from}</span>
                    <span>TO: {selected.to}</span>
                    <span>DELAY: {selected.delayMins} min</span>
                  </div>
                </div>
              </div>
              <div className="divider" />
              <div className="msg-body">
                {selected.body}
              </div>
              <div style={{ marginTop: 'var(--space-6)', display: 'flex', gap: 'var(--space-3)' }}>
                <button className="btn btn-primary btn-sm" onClick={() => setComposing(true)}>
                  <Send size={14} /> Reply
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 'var(--space-4)', opacity: 0.5 }}>
              <Inbox size={48} />
              <p>Select a transmission to read</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
