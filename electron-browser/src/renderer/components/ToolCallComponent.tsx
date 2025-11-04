import type { ToolCall } from '../types';

interface ToolCallComponentProps {
  toolCall: ToolCall;
}

export const ToolCallComponent = ({ toolCall }: ToolCallComponentProps) => {
  return (
    <div style={{
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      backgroundColor: '#fafafa',
      padding: '16px',
      marginBottom: '12px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* Tool Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px',
        paddingBottom: '12px',
        borderBottom: '1px solid #e0e0e0',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{
            fontSize: '16px',
            fontWeight: '500',
            color: '#1a1a1a',
          }}>
            🔧 {toolCall.toolName}
          </span>
        </div>
        <span style={{
          fontSize: '12px',
          fontWeight: '500',
          padding: '4px 8px',
          borderRadius: '4px',
          backgroundColor: toolCall.status === 'completed' ? '#e8f5e9' : '#fff3cd',
          color: toolCall.status === 'completed' ? '#2e7d32' : '#856404',
        }}>
          {toolCall.status === 'completed' ? '✓ Completed' : toolCall.status === 'pending' ? '⏳ Pending' : '✗ Failed'}
        </span>
      </div>

      {/* ARGS Section */}
      {toolCall.args && Object.keys(toolCall.args).length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{
            fontSize: '12px',
            fontWeight: '600',
            color: '#666',
            marginBottom: '6px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            ARGS:
          </div>
          <pre style={{
            backgroundColor: '#f5f5f5',
            padding: '12px',
            borderRadius: '4px',
            overflow: 'auto',
            fontSize: '13px',
            lineHeight: '1.4',
            color: '#333',
            margin: '0',
            maxHeight: '200px',
          }}>
            {JSON.stringify(toolCall.args, null, 2)}
          </pre>
        </div>
      )}

      {/* RESULT Section */}
      {toolCall.result && (
        <div style={{ marginBottom: '0' }}>
          <div style={{
            fontSize: '12px',
            fontWeight: '600',
            color: '#666',
            marginBottom: '6px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            RESULT:
          </div>
          <pre style={{
            backgroundColor: '#f5f5f5',
            padding: '12px',
            borderRadius: '4px',
            overflow: 'auto',
            fontSize: '13px',
            lineHeight: '1.4',
            color: '#333',
            margin: '0',
            maxHeight: '200px',
          }}>
            {typeof toolCall.result === 'string'
              ? toolCall.result
              : JSON.stringify(toolCall.result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
