// src/components/ErrorBoundary.jsx - React ErrorBoundary with error tracker integration

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, reportText: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] 游戏渲染错误:', error, errorInfo);

    // 从 props 获取 errorTracker
    try {
      var tracker = this.props.errorTracker;
      if (tracker) {
        const report = tracker.exportReport(error, errorInfo);
        const text = tracker.renderText(report);
        this.setState({ errorInfo, reportText: text });
      } else {
        this.setState({ errorInfo, reportText: '' });
      }
    } catch (e) {
      this.setState({ errorInfo, reportText: '' });
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleCopyReport = () => {
    if (this.state.reportText) {
      // 尝试复制到剪贴板
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard
          .writeText(this.state.reportText)
          .then(() => {
            this.setState({ copied: true });
            setTimeout(() => this.setState({ copied: false }), 2000);
          })
          .catch(() => this.fallbackCopy());
      } else {
        this.fallbackCopy();
      }
    }
  };

  fallbackCopy = () => {
    const ta = document.createElement('textarea');
    ta.value = this.state.reportText;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch (e) {}
    document.body.removeChild(ta);
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minHeight: '100vh',
            background: '#0a0a0f',
            color: '#c8b89a',
            fontFamily: 'serif',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              border: '2px solid #8b0000',
              borderRadius: '4px',
              padding: '2.5rem 3rem',
              maxWidth: '640px',
              width: '100%',
              background: 'rgba(139, 0, 0, 0.08)',
              boxShadow: '0 0 40px rgba(139, 0, 0, 0.15)',
            }}
          >
            <div
              style={{
                fontSize: '2.4rem',
                marginBottom: '1rem',
                color: '#8b0000',
                letterSpacing: '0.15em',
              }}
            >
              ⛧
            </div>
            <h2
              style={{
                margin: '0 0 0.8rem',
                fontSize: '1.35rem',
                color: '#d4a574',
                letterSpacing: '0.1em',
              }}
            >
              游戏遇到错误
            </h2>
            <p
              style={{
                margin: '0 0 1rem',
                fontSize: '0.9rem',
                color: '#8a7a6a',
                lineHeight: 1.6,
              }}
            >
              深渊的低语扰乱了叙事层……
              <br />
              某个不可名状的错误发生了。
            </p>

            {this.state.error && (
              <div
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: '3px',
                  padding: '0.7rem 1rem',
                  marginBottom: '1rem',
                  fontSize: '0.82rem',
                  color: '#cc8888',
                  textAlign: 'left',
                  fontFamily: 'monospace',
                  maxHeight: '80px',
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}
              >
                {this.state.error.name}: {this.state.error.message}
              </div>
            )}

            {/* 错误报告操作区 */}
            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                justifyContent: 'center',
                flexWrap: 'wrap',
                marginBottom: '1rem',
              }}
            >
              <button
                onClick={this.handleReload}
                style={{
                  background: 'transparent',
                  color: '#d4a574',
                  border: '1px solid #8b0000',
                  borderRadius: '3px',
                  padding: '0.55rem 1.5rem',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  letterSpacing: '0.06em',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(139, 0, 0, 0.2)';
                  e.target.style.borderColor = '#d4a574';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent';
                  e.target.style.borderColor = '#8b0000';
                }}
              >
                🔄 重新加载
              </button>

              {this.state.reportText && (
                <button
                  onClick={this.handleCopyReport}
                  style={{
                    background: 'transparent',
                    color: this.state.copied ? '#4a8' : '#d4a574',
                    border: '1px solid #444',
                    borderRadius: '3px',
                    padding: '0.55rem 1.5rem',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    letterSpacing: '0.06em',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(255,255,255,0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'transparent';
                  }}
                >
                  {this.state.copied ? '✅ 已复制' : '📋 复制错误报告'}
                </button>
              )}
            </div>

            {/* 报告预览（可折叠） */}
            {this.state.reportText && (
              <details
                style={{
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                <summary
                  style={{
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    color: '#887',
                    marginTop: '0.5rem',
                    userSelect: 'none',
                  }}
                >
                  🔍 展开查看完整错误报告
                </summary>
                <pre
                  style={{
                    background: 'rgba(0,0,0,0.4)',
                    borderRadius: '3px',
                    padding: '0.8rem',
                    marginTop: '0.5rem',
                    fontSize: '0.72rem',
                    color: '#998',
                    lineHeight: 1.5,
                    maxHeight: '300px',
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    margin: '0',
                  }}
                >
                  {this.state.reportText}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
