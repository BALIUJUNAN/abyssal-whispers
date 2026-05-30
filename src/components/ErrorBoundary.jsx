// src/components/ErrorBoundary.jsx - React ErrorBoundary for fatal render errors

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] 游戏渲染错误:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: '#0a0a0f',
          color: '#c8b89a',
          fontFamily: 'serif',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <div style={{
            border: '2px solid #8b0000',
            borderRadius: '4px',
            padding: '2.5rem 3rem',
            maxWidth: '480px',
            background: 'rgba(139, 0, 0, 0.08)',
            boxShadow: '0 0 40px rgba(139, 0, 0, 0.15)'
          }}>
            <div style={{
              fontSize: '2.4rem',
              marginBottom: '1rem',
              color: '#8b0000',
              letterSpacing: '0.15em'
            }}>⛧</div>
            <h2 style={{
              margin: '0 0 0.8rem',
              fontSize: '1.35rem',
              color: '#d4a574',
              letterSpacing: '0.1em'
            }}>
              游戏遇到错误
            </h2>
            <p style={{
              margin: '0 0 1.5rem',
              fontSize: '0.9rem',
              color: '#8a7a6a',
              lineHeight: 1.6
            }}>
              深渊的低语扰乱了叙事层……<br/>
              某个不可名状的错误发生了。
            </p>
            <button
              onClick={this.handleReload}
              style={{
                background: 'transparent',
                color: '#d4a574',
                border: '1px solid #8b0000',
                borderRadius: '3px',
                padding: '0.6rem 2rem',
                fontSize: '0.95rem',
                cursor: 'pointer',
                letterSpacing: '0.08em',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => {
                e.target.style.background = 'rgba(139, 0, 0, 0.2)';
                e.target.style.borderColor = '#d4a574';
              }}
              onMouseLeave={e => {
                e.target.style.background = 'transparent';
                e.target.style.borderColor = '#8b0000';
              }}
            >
              点击此处重新加载
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export { ErrorBoundary };
