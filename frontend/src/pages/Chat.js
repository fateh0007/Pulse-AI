import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  Loader2,
  MessageCircle,
  Sparkles,
  AlertCircle,
  Lock,
  Stethoscope
} from 'lucide-react';
import { io } from 'socket.io-client';
import { chatAPI, doctorsAPI } from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';

const Chat = () => {
  const { isPremiumActive, isUser, isDoctor, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: 'Hello! I\'m Pulse AI, your intelligent healthcare companion. How can I help you today?',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    // Check URL params first
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    if (mode === 'ai') return 'ai';
    if (mode === 'doctor') return 'doctor';
    // Default: doctors see doctor chat, patients see AI chat
    return isDoctor ? 'doctor' : 'ai';
  });
  const [connections, setConnections] = useState([]);
  const [selectedConnection, setSelectedConnection] = useState('');
  const [doctorMessages, setDoctorMessages] = useState([]);
  const [isLoadingDoctor, setIsLoadingDoctor] = useState(false);
  const [isSendingDoctor, setIsSendingDoctor] = useState(false);
  const [doctorInput, setDoctorInput] = useState('');
  const [isSocketReady, setIsSocketReady] = useState(false);
  const socketRef = useRef(null);
  const pendingQueueRef = useRef([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const doctorMessagesEndRef = useRef(null);
  const searchParams = new URLSearchParams(location.search);
  const requestedConnection = searchParams.get('connection');
  const requestedMode = searchParams.get('mode');
  const socketURL =
    process.env.REACT_APP_SOCKET_URL ||
    (process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace('/api', '') : undefined) ||
    'http://localhost:4000';

  const upsertIncomingMessage = useCallback(
    (data) => {
      const incomingId = data._id?.toString();
      const connectionId = data.connection?.toString();
      setDoctorMessages((prev) => {
        // only for the active connection
        if (connectionId && connectionId !== selectedConnection) return prev;
        // Already have this message by id
        if (incomingId && prev.some((m) => m._id === incomingId)) return prev;
        // Replace a pending placeholder that matches same sender and text
        const pendingIdx = prev.findIndex(
          (m) =>
            !m._id &&
            m.from === data.from &&
            m.message === data.message &&
            m.clientId === data.clientId
        );
        if (pendingIdx !== -1) {
          const clone = [...prev];
          clone[pendingIdx] = { ...data };
          return clone;
        }
        return [...prev, { ...data }];
      });
    },
    [selectedConnection]
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollDoctorChat = () => {
    doctorMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    scrollDoctorChat();
  }, [doctorMessages]);

  const loadConnections = useCallback(async () => {
    // Patients need premium; doctors always allowed
    if (isUser && !isPremiumActive) {
      setConnections([]);
      return;
    }
    if (!isUser && !isDoctor) return;
    setIsLoadingDoctor(true);
    try {
      const response = isDoctor ? await doctorsAPI.getMyPatients() : await doctorsAPI.getMyConnections();
      const conns = response.data || [];
      setConnections(conns);
      if (conns.length > 0) {
        setSelectedConnection((prev) => prev || conns[0]._id || conns[0].id);
      } else {
        setSelectedConnection('');
        setDoctorMessages([]);
      }
    } catch (error) {
      console.error('Error loading connections', error);
      toast.error('Unable to load doctor connections for chat.');
    } finally {
      setIsLoadingDoctor(false);
    }
  }, [isPremiumActive, isUser, isDoctor]);

  const loadDoctorMessages = useCallback(
    async (connectionId) => {
      if (!connectionId) return;
      setIsLoadingDoctor(true);
      try {
        const response = await chatAPI.getDoctorMessages(connectionId);
        setDoctorMessages(response.data || []);
      } catch (error) {
        console.error('Error loading doctor messages', error);
        toast.error(error?.response?.data?.message || 'Unable to load chat history.');
      } finally {
        setIsLoadingDoctor(false);
      }
    },
    []
  );

  useEffect(() => {
    if (activeTab === 'doctor' && ((isUser && isPremiumActive) || isDoctor)) {
      loadConnections();
    }
  }, [activeTab, isUser, isPremiumActive, isDoctor, loadConnections]);

  useEffect(() => {
    if (requestedMode === 'doctor') {
      setActiveTab('doctor');
    } else if (requestedMode === 'ai') {
      setActiveTab('ai');
    }
  }, [requestedMode]);

  useEffect(() => {
    if (activeTab === 'doctor' && selectedConnection) {
      loadDoctorMessages(selectedConnection);
    }
  }, [activeTab, selectedConnection, loadDoctorMessages]);

  useEffect(() => {
    if (!requestedConnection) return;
    setActiveTab('doctor');
    if (connections.length > 0) {
      const match = connections.find((c) => c._id === requestedConnection || c.id === requestedConnection);
      if (match) {
        setSelectedConnection(match._id || match.id);
        loadDoctorMessages(match._id || match.id);
      }
    }
  }, [requestedConnection, connections, loadDoctorMessages]);

  // Socket setup for realtime doctor chat
  useEffect(() => {
    const shouldConnect = activeTab === 'doctor' && (isDoctor || (isUser && isPremiumActive));
    if (!shouldConnect) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    const socket = io(socketURL, {
      auth: { token },
      transports: ['websocket']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsSocketReady(true);
      // flush queued messages
      if (pendingQueueRef.current.length) {
        pendingQueueRef.current.forEach((p) => socket.emit('sendMessage', p.payload, p.ack));
        pendingQueueRef.current = [];
      }
      if (selectedConnection) {
        socket.emit('joinConnection', { connectionId: selectedConnection });
      }
    });

    socket.on('disconnect', () => setIsSocketReady(false));
    socket.on('connect_error', (err) => {
      setIsSocketReady(false);
      toast.error('Realtime connection lost. Retrying...');
      console.error('Socket error', err.message);
    });

    socket.on('messageCreated', (data) => {
      const connectionId = data.connection?.toString();
      upsertIncomingMessage(data);

      // In-app notification for doctors when not viewing that chat
      if (
        isDoctor &&
        data.from === 'user' &&
        connectionId &&
        connectionId !== selectedConnection
      ) {
        toast.success('New message from patient');
        if (window.Notification && Notification.permission === 'granted') {
          new Notification('Pulse AI', { body: 'New patient message received.' });
        }
      }
    });

    socket.on('messagesRead', ({ connectionId, readAt }) => {
      setDoctorMessages((prev) =>
        prev.map((m) =>
          m.connection?.toString() === connectionId && m.readAt ? m : { ...m, readAt: readAt || m.readAt }
        )
      );
    });

    if (window.Notification && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    return () => {
      socket.disconnect();
      setIsSocketReady(false);
    };
  }, [activeTab, isDoctor, isPremiumActive, isUser, selectedConnection, socketURL]);

  // Join selected connection room when ready
  useEffect(() => {
    if (isSocketReady && selectedConnection && socketRef.current) {
      socketRef.current.emit('joinConnection', { connectionId: selectedConnection });
      // mark as read once joined
      socketRef.current.emit('markRead', { connectionId: selectedConnection });
    }
  }, [isSocketReady, selectedConnection]);

  useEffect(() => {
    if (isSocketReady && selectedConnection && socketRef.current && doctorMessages.length > 0) {
      socketRef.current.emit('markRead', { connectionId: selectedConnection });
    }
  }, [isSocketReady, selectedConnection, doctorMessages.length]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await chatAPI.sendMessage(inputMessage.trim());
      
      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: response.data.reply,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const fallbackReply = error?.response?.data?.reply;
      if (error?.response?.status === 503 && typeof fallbackReply === 'string') {
        const aiMessage = {
          id: Date.now() + 1,
          type: 'ai',
          content: fallbackReply,
          timestamp: new Date(),
          isError: true
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        toast.error('Failed to get AI response. Please try again.');
        const errorMessage = {
          id: Date.now() + 1,
          type: 'ai',
          content: 'I apologize, but I\'m having trouble processing your request right now. Please try again in a moment.',
          timestamp: new Date(),
          isError: true
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAIKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const handleDoctorKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendDoctorMessage(e);
    }
  };

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const quickQuestions = [
    "What are the symptoms of a common cold?",
    "How can I improve my sleep quality?",
    "What foods should I eat for better heart health?",
    "How often should I exercise?",
    "What are the benefits of drinking water?"
  ];

  const handleQuickQuestion = (question) => {
    setInputMessage(question);
    inputRef.current?.focus();
  };

  const handleSendDoctorMessage = async (e) => {
    e.preventDefault();
    if (!selectedConnection || !doctorInput.trim() || isSendingDoctor) return;
    setIsSendingDoctor(true);

    const clientId = `tmp-${Date.now()}`;
    const newMsg = {
      clientId,
      from: isDoctor ? 'doctor' : 'user',
      message: doctorInput.trim(),
      createdAt: new Date().toISOString()
    };
    setDoctorMessages((prev) => [...prev, newMsg]);
    setDoctorInput('');

    const emitPayload = { connectionId: selectedConnection, message: newMsg.message, clientId };
    const sendOverSocket = () =>
      socketRef.current?.emit('sendMessage', emitPayload, (ack) => {
        if (!ack?.ok) {
          toast.error(ack?.message || 'Failed to send message');
          setDoctorMessages((prev) => prev.filter((m) => m.clientId !== clientId));
        } else if (ack?.message) {
          setDoctorMessages((prev) =>
            prev.map((m) => (m.clientId === clientId ? { ...ack.message } : m))
          );
        }
        setIsSendingDoctor(false);
      });

    if (isSocketReady && socketRef.current) {
      sendOverSocket();
    } else {
      // queue until reconnected
      pendingQueueRef.current.push({
        payload: emitPayload,
        ack: (ack) => {
          if (!ack?.ok) {
            toast.error(ack?.message || 'Failed to send message');
            setDoctorMessages((prev) => prev.filter((m) => m.clientId !== clientId));
          } else if (ack?.message) {
            setDoctorMessages((prev) =>
              prev.map((m) => (m.clientId === clientId ? { ...ack.message } : m))
            );
          }
          setIsSendingDoctor(false);
        }
      });
    }
  };

  const doctorChatHeader = (
    <div className="card mb-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center space-x-2">
            <Stethoscope className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            <span>Chat with your doctor</span>
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Direct, private messaging is available for premium members connected to a doctor.
          </p>
        </div>
      </div>
    </div>
  );

  const renderDoctorChat = () => {
    // Patient gating
    if (isUser && !isPremiumActive) {
      return (
        <div className="card">
          <div className="flex items-start space-x-3">
            <Lock className="h-6 w-6 text-amber-500" />
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Premium required</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Upgrade to a premium subscription to message your connected doctors.
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (isLoadingDoctor && connections.length === 0) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-400"></div>
        </div>
      );
    }

    if (connections.length === 0) {
      return (
        <div className="card">
          <div className="flex items-start space-x-3">
            <Stethoscope className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                {isDoctor ? 'No patient conversations yet' : 'Connect with a doctor first'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {isDoctor
                  ? 'Patient messages will appear here as soon as they connect with you.'
                  : 'Once you connect with a doctor, you can start a secure conversation here.'}
              </p>
              {!isDoctor && (
                <button
                  onClick={() => navigate('/doctors')}
                  className="btn-primary mt-3"
                >
                  Browse doctors
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    const selectedDoctor = connections.find((c) => c._id === selectedConnection || c.id === selectedConnection);
    const participantName = isDoctor ? selectedDoctor?.user?.name : selectedDoctor?.doctor?.name;
    const participantSecondary = isDoctor ? 'Patient' : selectedDoctor?.doctor?.specialty;

    return (
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center space-x-3">
            <Stethoscope className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{isDoctor ? 'Patient' : 'Connected doctor'}</p>
              <p className="font-semibold text-gray-900 dark:text-gray-100">{participantName || 'Select a chat'}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{participantSecondary}</p>
            </div>
          </div>
          <select
            value={selectedConnection}
            onChange={(e) => {
              setSelectedConnection(e.target.value);
              setDoctorMessages([]);
            }}
            className="input-field md:w-64"
          >
            {connections.map((conn) => (
              <option key={conn._id} value={conn._id}>
                {isDoctor ? conn?.user?.name || 'Patient' : conn?.doctor?.name || 'Doctor'}
              </option>
            ))}
          </select>
        </div>

        <div className="card h-[600px] flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {doctorMessages.map((msg) => (
              <div
                key={msg._id || msg.clientId}
                className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] flex items-start space-x-2 ${msg.from === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <div
                    className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                      msg.from === 'user' ? 'bg-primary-600' : 'bg-green-100'
                    }`}
                  >
                    {msg.from === 'user' ? (
                      <User className="h-4 w-4 text-white" />
                    ) : (
                      <Stethoscope className="h-4 w-4 text-green-700" />
                    )}
                  </div>
                  <div
                    className={`rounded-lg px-4 py-2 ${
                      msg.from === 'user' ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    <p className={`text-sm whitespace-pre-wrap ${msg.from === 'user' ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>{msg.message}</p>
                    <p className={`text-xs mt-1 ${msg.from === 'user' ? 'text-primary-100' : 'text-gray-500 dark:text-gray-400'}`}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {msg.readAt && ' · Read'}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {isLoadingDoctor && (
              <div className="flex justify-start">
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-500 dark:text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Loading conversation...</span>
                </div>
              </div>
            )}

            <div ref={doctorMessagesEndRef} />
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <form onSubmit={handleSendDoctorMessage} className="flex space-x-2">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={doctorInput}
                  onChange={(e) => setDoctorInput(e.target.value)}
                  onKeyPress={handleDoctorKeyPress}
                  placeholder="Type your message to the doctor..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  rows="1"
                  style={{ minHeight: '40px', maxHeight: '120px' }}
                  disabled={isSendingDoctor}
                />
              </div>
              <button
                type="submit"
                disabled={!doctorInput.trim() || isSendingDoctor}
                className="btn-primary flex items-center justify-center px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSendingDoctor ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab('ai')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            activeTab === 'ai' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          AI Assistant
        </button>
        <button
          onClick={() => setActiveTab('doctor')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            activeTab === 'doctor' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          Doctor Chat
        </button>
      </div>

      {activeTab === 'ai' && (
        <>
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
              <MessageCircle className="h-8 w-8 text-primary-600 dark:text-primary-400 mr-3" />
              AI Health Assistant
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Get instant health advice and information from our AI-powered assistant
            </p>
          </div>

          {/* Chat Container */}
          <div className="card h-[600px] flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] flex items-start space-x-2 ${
                      message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                        message.type === 'user'
                          ? 'bg-primary-600'
                          : message.isError
                          ? 'bg-red-100 dark:bg-red-900/20'
                          : 'bg-green-100 dark:bg-green-900/20'
                      }`}
                    >
                      {message.type === 'user' ? (
                        <User className="h-4 w-4 text-white" />
                      ) : message.isError ? (
                        <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      ) : (
                        <Bot className="h-4 w-4 text-green-600 dark:text-green-400" />
                      )}
                    </div>
                    <div
                      className={`rounded-lg px-4 py-2 ${
                        message.type === 'user'
                          ? 'bg-primary-600 text-white'
                          : message.isError
                          ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      <p className={`text-sm whitespace-pre-wrap ${message.type === 'user' ? 'text-white' : message.isError ? 'text-red-800 dark:text-red-300' : 'text-gray-900 dark:text-gray-100'}`}>{message.content}</p>
                      <p
                        className={`text-xs mt-1 ${
                          message.type === 'user'
                            ? 'text-primary-100'
                            : message.isError
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-start space-x-2">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-2">
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin text-gray-500 dark:text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-300">AI is thinking...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Questions */}
            {messages.length === 1 && (
              <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Quick questions to get started:</p>
                <div className="flex flex-wrap gap-2">
                  {quickQuestions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuickQuestion(question)}
                      className="text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full transition-colors"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-4">
              <form onSubmit={handleSendMessage} className="flex space-x-2">
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleAIKeyPress}
                    placeholder="Ask me anything about health, symptoms, or wellness..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                    rows="1"
                    style={{ minHeight: '40px', maxHeight: '120px' }}
                    disabled={isLoading}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isLoading}
                  className="btn-primary flex items-center justify-center px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* AI Info */}
          <div className="card bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <div className="flex items-start space-x-3">
              <Sparkles className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900 dark:text-blue-200">About Pulse AI</h3>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  I'm an AI-powered health assistant designed to provide general health information and guidance. 
                  Please remember that I cannot replace professional medical advice, diagnosis, or treatment. 
                  Always consult with a qualified healthcare provider for serious health concerns.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'doctor' && (
        <>
          {doctorChatHeader}
          {renderDoctorChat()}
        </>
      )}
    </div>
  );
};

export default Chat;
