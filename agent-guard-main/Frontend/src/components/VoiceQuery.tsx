import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, X } from 'lucide-react';
import type { AnalysisResult } from '@/types';

interface VoiceQueryProps {
  analysis: AnalysisResult;
}

export function VoiceQuery({ analysis }: VoiceQueryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check if browser supports speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event: any) => {
        const speechToText = event.results[0][0].transcript;
        setTranscript(speechToText);
        handleQuery(speechToText);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const handleQuery = (query: string) => {
    const lowercaseQuery = query.toLowerCase();

    // Simple query matching
    if (lowercaseQuery.includes('risk score') || lowercaseQuery.includes('risk')) {
      setResponse(`The current risk score is ${analysis.riskScore} out of 100, which is considered ${analysis.riskScore >= 70 ? 'high' : analysis.riskScore >= 40 ? 'moderate' : 'low'} risk. This score is based on ${analysis.anomaliesDetected} detected anomalies across ${analysis.totalTransactions.toLocaleString()} transactions.`);
    } else if (lowercaseQuery.includes('anomalies') || lowercaseQuery.includes('anomaly')) {
      const highSeverity = analysis.anomalies.filter(a => a.severity === 'high').length;
      setResponse(`We detected ${analysis.anomaliesDetected} anomalies in total. ${highSeverity} are high severity and require immediate attention. The most critical is: ${analysis.anomalies[0]?.description}.`);
    } else if (lowercaseQuery.includes('duplicate')) {
      const duplicates = analysis.anomalies.filter(a => a.type === 'duplicate');
      if (duplicates.length > 0) {
        setResponse(`Found ${duplicates.length} duplicate transaction(s). ${duplicates[0]?.details}`);
      } else {
        setResponse('No duplicate transactions were detected in the current analysis.');
      }
    } else if (lowercaseQuery.includes('transaction') || lowercaseQuery.includes('total')) {
      setResponse(`We analyzed ${analysis.totalTransactions.toLocaleString()} transactions across ${analysis.documents.length} documents. The analysis identified ${analysis.anomaliesDetected} items requiring review.`);
    } else if (lowercaseQuery.includes('document')) {
      setResponse(`${analysis.documents.length} documents have been processed and analyzed. All documents completed processing successfully.`);
    } else if (lowercaseQuery.includes('highest') || lowercaseQuery.includes('worst')) {
      const highestSeverity = analysis.anomalies.find(a => a.severity === 'high');
      if (highestSeverity) {
        setResponse(`The highest severity issue is: ${highestSeverity.description}. ${highestSeverity.details} Recommended action: ${highestSeverity.suggestedAction}`);
      } else {
        setResponse('No high severity issues were detected.');
      }
    } else {
      setResponse(`I analyzed your query about "${query}". The system has processed ${analysis.documents.length} documents, found ${analysis.anomaliesDetected} anomalies, and calculated a risk score of ${analysis.riskScore}. Ask me about risk score, anomalies, duplicates, or transactions for more specific information.`);
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setResponse('Voice recognition is not supported in your browser. Please try Chrome or Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setTranscript('');
      setResponse('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center group hover:scale-110"
      >
        <Mic className="w-6 h-6" />
        <div className="absolute bottom-full mb-2 right-0 hidden group-hover:block bg-slate-900 text-white text-sm py-2 px-3 rounded-lg whitespace-nowrap">
          Voice Query
        </div>
      </button>

      {/* Voice Query Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                  <Mic className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-slate-900">Voice Query Assistant</h2>
                  <p className="text-sm text-slate-600">Ask questions about your audit data</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                title="Close assistant"
                aria-label="Close voice assistant"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Microphone Control */}
              <div className="text-center">
                <button
                  onClick={toggleListening}
                  className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto transition-all ${isListening
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                    : 'bg-gradient-to-br from-purple-600 to-pink-600 hover:scale-110'
                    }`}
                >
                  {isListening ? (
                    <MicOff className="w-10 h-10 text-white" />
                  ) : (
                    <Mic className="w-10 h-10 text-white" />
                  )}
                </button>
                <p className="mt-4 text-slate-700">
                  {isListening ? 'Listening...' : 'Click to start speaking'}
                </p>
              </div>

              {/* Transcript */}
              {transcript && (
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <p className="text-xs text-slate-600 mb-1">You asked:</p>
                  <p className="text-slate-900">{transcript}</p>
                </div>
              )}

              {/* Response */}
              {response && (
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
                  <p className="text-xs text-purple-600 mb-1">AI Response:</p>
                  <p className="text-slate-900">{response}</p>
                </div>
              )}

              {/* Suggested Queries */}
              {!transcript && !isListening && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">Try asking:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      'What is the risk score?',
                      'How many anomalies were found?',
                      'Are there any duplicates?',
                      'What is the highest severity issue?'
                    ].map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setTranscript(suggestion);
                          handleQuery(suggestion);
                        }}
                        className="text-left px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-lg text-sm text-slate-700 transition-colors border border-slate-200"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
