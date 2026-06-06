// Variant A — Playground Console
// Auth → Upload → Choose model → Generate → Poll → Display

// ── API CONFIG ───────────────────────────────────────────────────────────────
const API_BASE = '';

const api = {
  async login(username, password) {
    const form = new URLSearchParams({ username, password });
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Неверный логин или пароль');
    return res.json();
  },

  async listModels(token) {
    const res = await fetch(`${API_BASE}/api/models/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Не удалось загрузить список моделей');
    return res.json();
  },

  async uploadImage(token, file) {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${API_BASE}/api/images/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Ошибка загрузки');
    return res.json();
  },

  async requestCaption(token, imageId, userPrompt, modelName) {
    const res = await fetch(`${API_BASE}/api/images/${imageId}/caption`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_prompt: userPrompt || null, model_name: modelName || null }),
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Ошибка запуска генерации');
    return res.json();
  },

  async pollCaptions(token, imageId) {
    const res = await fetch(`${API_BASE}/api/images/${imageId}/captions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Ошибка получения результата');
    return res.json();
  },
};

// ── STYLE PRESETS ────────────────────────────────────────────────────────────
const STYLE_PRESETS = {
  short:    'Опиши товар одним коротким предложением (до 20 слов).',
  detailed: 'Опиши товар подробно в 2-3 предложениях. Выдели материал, цвет, назначение.',
  alt:      'Напиши alt-текст для изображения: что изображено, для кого, без лишних слов.',
  seo:      'Напиши SEO-описание товара с ключевыми словами через запятую. Без лишних предложений.',
  tags:     'Выпиши 10-12 тегов для товара через запятую. Только существительные, в нижнем регистре.',
};

const STYLE_LABELS = [
  ['short', 'Short'],
  ['detailed', 'Detailed'],
  ['alt', 'Alt-text'],
  ['seo', 'SEO'],
  ['tags', 'Tags'],
];

// ── HELPERS ──────────────────────────────────────────────────────────────────
function formatBytes(b) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 ** 2).toFixed(1)} MB`;
}

const SPEED_COLORS = {
  fast:   { bg: '#E7F8D4', fg: '#3F6B1C' },
  medium: { bg: '#FFF8DC', fg: '#7A5C00' },
  slow:   { bg: '#FFE4DC', fg: '#8C2F18' },
};

// ── AUTH SCREEN ──────────────────────────────────────────────────────────────
const LoginScreen = ({ onLogin }) => {
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await api.login(username, password);
      onLogin(data.access_token, username);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={loginStyles.overlay}>
      <div style={loginStyles.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div style={{ display: 'flex' }}>
            {['#FF6B4A', '#2F6BFF', '#C6FF4A'].map((c, i) => (
              <div key={c} style={{ width: 20, height: 20, borderRadius: '50%',
                background: c, border: '1.5px solid #1E1914', marginLeft: i ? -6 : 0 }} />
            ))}
          </div>
          <span style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em' }}>
            caption<span style={{ fontStyle: 'italic', color: '#FF6B4A' }}>.lab</span>
          </span>
        </div>

        <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 6 }}>Войти в аккаунт</div>
        <div style={{ fontSize: 13, color: '#6a5f53', marginBottom: 24 }}>Playground для генерации описаний</div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={loginStyles.label}>Имя пользователя</label>
            <input style={loginStyles.input} value={username} onChange={e => setUsername(e.target.value)}
              placeholder="username" required autoFocus />
          </div>
          <div>
            <label style={loginStyles.label}>Пароль</label>
            <input style={loginStyles.input} type="password" value={password}
              onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>

          {error && (
            <div style={loginStyles.error}><span style={{ fontWeight: 600 }}>!</span> {error}</div>
          )}

          <button style={loginStyles.btn} type="submit" disabled={loading}>
            {loading ? 'Вход…' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  );
};

const loginStyles = {
  overlay: {
    position: 'fixed', inset: 0, background: '#FAF5EB',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: '"Geist", system-ui, sans-serif', zIndex: 1000,
  },
  card: {
    background: '#fff', border: '1.5px solid #1E1914', borderRadius: 16,
    boxShadow: '6px 6px 0 #1E1914', padding: '36px 40px', width: 380,
  },
  label: {
    display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6,
    fontFamily: '"JetBrains Mono", monospace', textTransform: 'uppercase', letterSpacing: '0.05em',
  },
  input: {
    width: '100%', padding: '10px 12px', fontSize: 14,
    border: '1.5px solid #1E1914', borderRadius: 8, outline: 'none',
    fontFamily: 'inherit', background: '#FAF5EB', boxSizing: 'border-box',
  },
  error: {
    padding: '10px 12px', background: '#FFE4DC', border: '1.5px solid #1E1914',
    borderRadius: 8, fontSize: 13, color: '#8C2F18',
  },
  btn: {
    padding: '12px 0', background: '#C6FF4A', color: '#1E1914',
    border: '1.5px solid #1E1914', borderRadius: 8, fontSize: 15,
    fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: '3px 3px 0 #1E1914',
  },
};

// ── MAIN COMPONENT ───────────────────────────────────────────────────────────
const PlaygroundConsole = () => {
  // Auth
  const [token, setToken] = React.useState(() => localStorage.getItem('caption_token') || '');
  const [username, setUsername] = React.useState(() => localStorage.getItem('caption_user') || '');

  // Upload
  const [file, setFile] = React.useState(null);
  const [previewUrl, setPreviewUrl] = React.useState(null);
  const [imageId, setImageId] = React.useState(null);
  const [dragOver, setDragOver] = React.useState(false);

  // Generation
  const [phase, setPhase] = React.useState('idle');
  const [styleTab, setStyleTab] = React.useState('detailed');
  const [promptText, setPromptText] = React.useState(STYLE_PRESETS.detailed);
  const [maxTokens, setMaxTokens] = React.useState(150);
  const [temperature, setTemperature] = React.useState(0.4);

  // Models
  const [models, setModels] = React.useState([]);
  const [selectedModel, setSelectedModel] = React.useState(
    () => localStorage.getItem('caption_model') || null
  );
  const [modelsLoading, setModelsLoading] = React.useState(false);
  const [modelsError, setModelsError] = React.useState(null);

  // Results
  const [results, setResults] = React.useState({});
  const [activeCaption, setActiveCaption] = React.useState(null);
  const [elapsedMs, setElapsedMs] = React.useState(null);

  // UI
  const [copied, setCopied] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState('');
  const [error, setError] = React.useState(null);
  const [streamedChars, setStreamedChars] = React.useState(0);

  const pollingRef = React.useRef(null);
  const startTimeRef = React.useRef(null);
  const fileInputRef = React.useRef(null);

  // ── Load models on login ──────────────────────────────────────────────────
  React.useEffect(() => {
    if (!token) return;
    setModelsLoading(true);
    setModelsError(null);

    api.listModels(token)
      .then(data => {
        setModels(data);
        const savedExists = data.some(m => m.name === selectedModel);
        if (!savedExists && data.length > 0) {
          setSelectedModel(data[0].name);
          localStorage.setItem('caption_model', data[0].name);
        }
      })
      .catch(err => setModelsError(err.message))
      .finally(() => setModelsLoading(false));
  }, [token]);

  // ── AUTH ──────────────────────────────────────────────────────────────────
  const handleLogin = (tk, user) => {
    localStorage.setItem('caption_token', tk);
    localStorage.setItem('caption_user', user);
    setToken(tk);
    setUsername(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('caption_token');
    localStorage.removeItem('caption_user');
    setToken('');
    setUsername('');
  };

  if (!token) return <LoginScreen onLogin={handleLogin} />;

  // ── Model selection ───────────────────────────────────────────────────────
  const pickModel = (name) => {
    setSelectedModel(name);
    localStorage.setItem('caption_model', name);
  };

  // ── FILE HANDLING ─────────────────────────────────────────────────────────
  const handleFile = (f) => {
    if (!f) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(f.type)) {
      setError({ title: 'Неподдерживаемый формат', sub: `${f.name} — принимаются JPEG, PNG, WebP.` });
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError({ title: 'Файл слишком большой', sub: `Максимум 10 МБ, у вас ${formatBytes(f.size)}.` });
      return;
    }
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setImageId(null);
    setResults({});
    setActiveCaption(null);
    setPhase('idle');
    setError(null);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const removeFile = () => {
    setFile(null);
    setPreviewUrl(null);
    setImageId(null);
    setResults({});
    setActiveCaption(null);
    setPhase('idle');
    setError(null);
    if (pollingRef.current) clearInterval(pollingRef.current);
  };

  // ── STYLE TABS ────────────────────────────────────────────────────────────
  const switchTab = (tab) => {
    setStyleTab(tab);
    setEditing(false);
    if (results[tab]) {
      setActiveCaption(results[tab].text);
      setElapsedMs(results[tab].ms);
    } else {
      setPromptText(STYLE_PRESETS[tab]);
      if (phase === 'done') setPhase('idle');
    }
  };

  // ── QUICK CHIPS ───────────────────────────────────────────────────────────
  const addChip = (text) => setPromptText(p => p ? p + ' ' + text : text);

  // ── POLLING ───────────────────────────────────────────────────────────────
  const startPolling = (imgId, tab) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        const captions = await api.pollCaptions(token, imgId);
        if (!captions.length) return;

        const latest = captions[0];

        if (latest.status === 'completed') {
          clearInterval(pollingRef.current);
          const text = latest.text || '';
          const ms = latest.processing_time_ms;

          setResults(prev => ({ ...prev, [tab]: { text, ms, model: latest.model_name } }));
          setElapsedMs(ms);
          setActiveCaption(text);
          setStreamedChars(0);
          setPhase('streaming');

          let i = 0;
          const interval = setInterval(() => {
            i += 6;
            setStreamedChars(i);
            if (i >= text.length) {
              clearInterval(interval);
              setPhase('done');
            }
          }, 20);

        } else if (latest.status === 'failed') {
          clearInterval(pollingRef.current);
          setPhase('error');
          setError({
            title: 'Ошибка генерации',
            sub: latest.error_message || 'Модель не смогла обработать изображение.',
          });

        } else {
          setPhase(latest.status === 'processing' ? 'processing' : 'pending');
        }
      } catch (err) {
        clearInterval(pollingRef.current);
        setPhase('error');
        setError({ title: 'Ошибка соединения', sub: err.message });
      }
    }, 2000);
  };

  // ── RUN ───────────────────────────────────────────────────────────────────
  const run = async () => {
    if (!file) {
      setError({ title: 'Загрузите изображение', sub: 'Перетащите файл или нажмите на область загрузки.' });
      return;
    }
    if (!selectedModel) {
      setError({ title: 'Не выбрана модель', sub: 'Установите модель через ollama pull и выберите её слева.' });
      return;
    }
    if (['pending', 'processing', 'uploading', 'streaming'].includes(phase)) return;

    setError(null);
    setActiveCaption(null);
    setElapsedMs(null);
    startTimeRef.current = Date.now();

    try {
      let imgId = imageId;
      if (!imgId) {
        setPhase('uploading');
        const uploaded = await api.uploadImage(token, file);
        imgId = uploaded.id;
        setImageId(imgId);
      }

      setPhase('pending');
      await api.requestCaption(token, imgId, promptText, selectedModel);
      startPolling(imgId, styleTab);

    } catch (err) {
      setPhase('error');
      setError({ title: 'Ошибка', sub: err.message });
    }
  };

  // ── COPY ──────────────────────────────────────────────────────────────────
  const handleCopy = () => {
    const text = results[styleTab]?.text || activeCaption || '';
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  // ── DERIVED ───────────────────────────────────────────────────────────────
  const currentText = results[styleTab]?.text || activeCaption || '';
  const isStreaming = phase === 'streaming' && activeCaption;
  const displayText = isStreaming
    ? activeCaption.slice(0, streamedChars)
    : (editing ? editValue : currentText);

  const selectedModelMeta = models.find(m => m.name === selectedModel);
  const headerModelName = selectedModelMeta?.label || selectedModel?.split(':')[0] || 'no model';
  const isBusy = ['pending', 'processing', 'uploading', 'streaming'].includes(phase);

  const statusLabel = {
    uploading: 'uploading…',
    pending: 'queued…',
    processing: 'generating…',
    streaming: 'streaming',
    done: `done · ${elapsedMs ? (elapsedMs / 1000).toFixed(2) + 's' : ''}`,
  }[phase];

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={pcStyles.root}>
      {/* TOP BAR */}
      <header style={pcStyles.topbar}>
        <div style={pcStyles.brandRow}>
          <div style={pcStyles.logoMark}>
            {['#FF6B4A', '#2F6BFF', '#C6FF4A'].map((c, i) => (
              <div key={c} style={{ ...pcStyles.logoBlob, background: c, marginLeft: i ? -8 : 0 }} />
            ))}
          </div>
          <div style={pcStyles.wordmark}>
            caption<span style={{ fontStyle: 'italic', color: '#FF6B4A' }}>.lab</span>
          </div>
          <span style={pcStyles.envPill}>api playground</span>
        </div>
        <nav style={pcStyles.nav}>
          <a style={{ ...pcStyles.navLink, color: '#2a1f16' }}>Playground</a>
          <a style={pcStyles.navLink} href="/docs" target="_blank">Docs</a>
        </nav>
        <div style={pcStyles.rightTools}>
          <div style={pcStyles.keyBadge}>
            <span style={{
              ...pcStyles.keyDot,
              background: selectedModel ? '#7BB93C' : '#cccccc',
            }} />
            <span>{headerModelName}</span>
          </div>
          <div style={{ ...pcStyles.avatar, cursor: 'pointer' }} title="Выйти" onClick={handleLogout}>
            {username?.[0]?.toUpperCase() || 'U'}
          </div>
        </div>
      </header>

      {/* MAIN SPLIT */}
      <main style={pcStyles.main}>
        {/* LEFT */}
        <section style={pcStyles.leftCol}>
          {/* 01. INPUT */}
          <div style={pcStyles.sectionHead}>
            <div style={pcStyles.stepNum}>01</div>
            <div>
              <div style={pcStyles.sectionTitle}>Input</div>
              <div style={pcStyles.sectionSub}>Drop an image or click to browse</div>
            </div>
          </div>

          {!file ? (
            <div
              style={{
                ...pcStyles.emptyDrop,
                ...(dragOver ? { borderColor: '#FF6B4A', background: '#FFF0E8' } : {}),
              }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }} onChange={e => handleFile(e.target.files?.[0])} />
              <div style={{ fontSize: 28, marginBottom: 8 }}>⊕</div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Drop image here</div>
              <div style={{ fontSize: 12, color: '#6a5f53', marginTop: 4 }}>JPEG, PNG, WebP · max 10 MB</div>
            </div>
          ) : (
            <div style={pcStyles.dropcard}>
              <div style={pcStyles.dropPreview}>
                <img src={previewUrl} alt="preview"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                <div style={pcStyles.dropMeta}>
                  <div style={pcStyles.metaRow}>
                    <span style={pcStyles.fileName}>{file.name}</span>
                    <button style={pcStyles.removeBtn} onClick={removeFile}>✕</button>
                  </div>
                  <div style={pcStyles.metaSub}>
                    {formatBytes(file.size)} · {file.type.split('/')[1].toUpperCase()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 02. REQUEST */}
          <div style={pcStyles.sectionHead}>
            <div style={{ ...pcStyles.stepNum, background: '#2F6BFF' }}>02</div>
            <div>
              <div style={pcStyles.sectionTitle}>Request</div>
              <div style={pcStyles.sectionSub}>Choose model and describe what you need</div>
            </div>
          </div>

          {/* MODEL SELECTOR */}
          <div style={pcStyles.promptWrap}>
            <div style={pcStyles.promptHead}>
              <span style={pcStyles.promptLabel}>Model</span>
              <span style={pcStyles.promptHint}>
                {modelsLoading ? 'загрузка…'
                  : modelsError ? 'ошибка'
                  : `${models.length} установлено`}
              </span>
            </div>

            {modelsError && (
              <div style={{
                fontSize: 12, color: '#8C2F18', background: '#FFE4DC',
                padding: '8px 10px', border: '1.5px solid #1E1914', borderRadius: 8,
              }}>
                Ollama недоступна. Проверь, что контейнер запущен.
              </div>
            )}

            {!modelsError && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {models.map(m => {
                  const isActive = selectedModel === m.name;
                  const colors = SPEED_COLORS[m.speed] || SPEED_COLORS.medium;
                  return (
                    <label
                      key={m.name}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 10px',
                        border: `1.5px solid ${isActive ? '#2F6BFF' : '#1E1914'}`,
                        borderRadius: 8,
                        background: isActive ? '#F0F4FF' : '#FAF5EB',
                        cursor: 'pointer',
                        transition: 'background 0.1s',
                      }}
                    >
                      <input
                        type="radio"
                        name="model"
                        value={m.name}
                        checked={isActive}
                        onChange={() => pickModel(m.name)}
                        style={{ accentColor: '#2F6BFF', flexShrink: 0 }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{m.label}</div>
                        <div style={{
                          fontSize: 11, color: '#6a5f53',
                          fontFamily: '"JetBrains Mono", monospace',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {m.note} · {m.size_gb} ГБ
                        </div>
                      </div>
                      <div style={{
                        fontSize: 10, fontWeight: 600,
                        padding: '2px 7px', borderRadius: 10,
                        fontFamily: '"JetBrains Mono", monospace',
                        background: colors.bg,
                        color: colors.fg,
                        border: `1px solid ${colors.fg}`,
                        flexShrink: 0,
                      }}>
                        {m.speed}
                      </div>
                    </label>
                  );
                })}

                {!modelsLoading && models.length === 0 && (
                  <div style={{ fontSize: 12, color: '#6a5f53', padding: '10px' }}>
                    Нет установленных моделей. В терминале:<br/>
                    <code style={{
                      fontFamily: '"JetBrains Mono", monospace',
                      background: '#1E1914', color: '#C6FF4A',
                      padding: '2px 6px', borderRadius: 3,
                      display: 'inline-block', marginTop: 4,
                    }}>
                      docker compose exec ollama ollama pull moondream
                    </code>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* PROMPT */}
          <div style={pcStyles.promptWrap}>
            <div style={pcStyles.promptHead}>
              <span style={pcStyles.promptLabel}>Prompt</span>
              <span style={pcStyles.promptHint}>guide the model's output</span>
            </div>
            <textarea
              style={pcStyles.promptArea}
              value={promptText}
              onChange={e => setPromptText(e.target.value)}
              placeholder="Опиши товар…"
            />
            <div style={pcStyles.promptFooter}>
              <div style={pcStyles.promptChips}>
                <button style={pcStyles.promptChip} onClick={() => addChip('Упомяни цвет и материал.')}>+ Цвет и материал</button>
                <button style={pcStyles.promptChip} onClick={() => addChip('Одно предложение.')}>+ Коротко</button>
                <button style={pcStyles.promptChip} onClick={() => addChip('На русском.')}>+ Рус</button>
              </div>
              <span style={pcStyles.promptCount}>{promptText.length} / 2000</span>
            </div>
          </div>

          {/* PARAMS */}
          <div style={pcStyles.paramGrid}>
            <ParamRow label="Temperature">
              <div style={pcStyles.sliderRow}>
                <input type="range" min="0" max="1" step="0.05" value={temperature}
                  onChange={e => setTemperature(+e.target.value)}
                  style={{ flex: 1, accentColor: '#FF6B4A' }} />
                <span style={pcStyles.sliderVal}>{temperature.toFixed(2)}</span>
              </div>
            </ParamRow>
            <ParamRow label="Max tokens">
              <div style={pcStyles.sliderRow}>
                <input type="range" min="50" max="600" step="10" value={maxTokens}
                  onChange={e => setMaxTokens(+e.target.value)}
                  style={{ flex: 1, accentColor: '#2F6BFF' }} />
                <span style={pcStyles.sliderVal}>{maxTokens}</span>
              </div>
            </ParamRow>
          </div>

          <button
            style={{
              ...pcStyles.runBtn,
              ...(isBusy ? { opacity: 0.6, cursor: 'not-allowed' } : {}),
            }}
            onClick={run}
          >
            <span style={pcStyles.runDot} />
            {phase === 'uploading' ? 'Uploading…'
              : phase === 'pending' ? 'Queued…'
              : phase === 'processing' ? 'Generating…'
              : phase === 'streaming' ? 'Streaming…'
              : 'Run caption'}
            <span style={pcStyles.runShortcut}>⌘ ⏎</span>
          </button>
        </section>

        {/* RIGHT */}
        <section style={pcStyles.rightCol}>
          <div style={pcStyles.respHead}>
            <div style={pcStyles.respTabs}>
              {STYLE_LABELS.map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => switchTab(k)}
                  style={{ ...pcStyles.respTab, ...(styleTab === k ? pcStyles.respTabActive : {}) }}
                >
                  {label}
                  {results[k] && (
                    <span style={{ marginLeft: 5, width: 6, height: 6, borderRadius: '50%',
                      background: '#7BB93C', display: 'inline-block', verticalAlign: 'middle' }} />
                  )}
                </button>
              ))}
            </div>
            <div style={pcStyles.statusGroup}>
              {['pending', 'processing', 'uploading'].includes(phase) && (
                <div style={pcStyles.statusPill}>
                  <span style={pcStyles.pulseDot} />
                  {statusLabel}
                </div>
              )}
              {phase === 'streaming' && (
                <div style={pcStyles.statusPill}>
                  <span style={pcStyles.pulseDot} />streaming
                </div>
              )}
              {phase === 'done' && (
                <div style={{ ...pcStyles.statusPill, background: '#E7F8D4', color: '#3F6B1C' }}>
                  <span style={{ ...pcStyles.pulseDot, background: '#7BB93C', animation: 'none' }} />
                  {statusLabel}
                </div>
              )}
            </div>
          </div>

          <div style={pcStyles.respBody}>
            {phase === 'idle' && !currentText && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', height: '100%', color: '#6a5f53', gap: 10 }}>
                <div style={{ fontSize: 32 }}>◎</div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>Загрузите изображение и нажмите Run</div>
                <div style={{ fontSize: 12 }}>Результат появится здесь</div>
              </div>
            )}

            {['pending', 'processing', 'uploading'].includes(phase) && !currentText && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', height: '100%', gap: 16 }}>
                <div style={spinnerStyle} />
                <div style={{ fontSize: 14, color: '#6a5f53' }}>
                  {phase === 'uploading' ? 'Загружаю изображение…'
                    : phase === 'pending' ? 'Задача в очереди Celery…'
                    : 'Модель обрабатывает изображение…'}
                </div>
              </div>
            )}

            {(isStreaming || (phase === 'done' && currentText)) && (
              <>
                {styleTab === 'tags' ? (
                  <div style={pcStyles.tagCloud}>
                    {displayText.split(',').map(t => t.trim()).filter(Boolean).map((t, i) => (
                      <span key={i} style={pcStyles.tagChip}>#{t}</span>
                    ))}
                  </div>
                ) : editing ? (
                  <textarea
                    value={editValue}
                    style={pcStyles.editArea}
                    autoFocus
                    onChange={e => setEditValue(e.target.value)}
                    onBlur={() => {
                      setResults(prev => ({
                        ...prev,
                        [styleTab]: { ...prev[styleTab], text: editValue },
                      }));
                      setActiveCaption(editValue);
                      setEditing(false);
                    }}
                  />
                ) : (
                  <p style={pcStyles.captionText} onDoubleClick={() => {
                    setEditValue(currentText);
                    setEditing(true);
                  }}>
                    {displayText}
                    {isStreaming && <span style={pcStyles.caret} />}
                  </p>
                )}
              </>
            )}
          </div>

          {/* FOOTER */}
          <div style={pcStyles.respFooter}>
            <div style={pcStyles.metaStats}>
              {elapsedMs != null && (
                <span style={pcStyles.metaStat}>
                  <b>{(elapsedMs / 1000).toFixed(2)}s</b>&nbsp;latency
                </span>
              )}
              {currentText && (
                <span style={pcStyles.metaStat}>
                  <b>{currentText.split(/\s+/).filter(Boolean).length}</b>&nbsp;words
                </span>
              )}
              <span style={pcStyles.metaStat}>
                <b>{results[styleTab]?.model || selectedModel || 'no model'}</b>
              </span>
            </div>
            <div style={pcStyles.actionRow}>
              {phase === 'done' && !editing && (
                <button style={pcStyles.iconBtn} onClick={() => {
                  setEditValue(currentText);
                  setEditing(true);
                }}>✎ Edit</button>
              )}
              {imageId && (
                <button style={pcStyles.iconBtn} onClick={run} disabled={isBusy}>↻ Regenerate</button>
              )}
              {currentText && (
                <button style={{ ...pcStyles.iconBtn, ...pcStyles.iconBtnPrimary }} onClick={handleCopy}>
                  {copied ? '✓ Copied' : '⧉ Copy'}
                </button>
              )}
            </div>
          </div>

          {error && (
            <div style={pcStyles.errorCard}>
              <div style={pcStyles.errorIcon}>!</div>
              <div style={{ flex: 1 }}>
                <div style={pcStyles.errorTitle}>{error.title}</div>
                <div style={pcStyles.errorSub}>{error.sub}</div>
              </div>
              <button style={pcStyles.errorDismiss} onClick={() => setError(null)}>✕</button>
            </div>
          )}
        </section>
      </main>

      <style>{`
        @keyframes pc-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.7)} }
        @keyframes pc-caret { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes pc-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

// ── SUB-COMPONENTS ────────────────────────────────────────────────────────────
const ParamRow = ({ label, children }) => (
  <div style={pcStyles.paramRow}>
    <div style={pcStyles.paramLabel}>{label}</div>
    <div style={{ flex: 1 }}>{children}</div>
  </div>
);

const spinnerStyle = {
  width: 36, height: 36,
  border: '3px solid #EFE6D6',
  borderTop: '3px solid #FF6B4A',
  borderRadius: '50%',
  animation: 'pc-spin 0.9s linear infinite',
};

// ── STYLES ────────────────────────────────────────────────────────────────────
const pcStyles = {
  root: {
    width: 1280, minHeight: 820,
    background: '#FAF5EB',
    fontFamily: '"Geist", "Inter", system-ui, sans-serif',
    color: '#1E1914',
    display: 'flex', flexDirection: 'column',
    position: 'relative',
  },
  topbar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 28px', borderBottom: '1.5px solid #1E1914', background: '#FAF5EB',
  },
  brandRow: { display: 'flex', alignItems: 'center', gap: 14 },
  logoMark: { display: 'flex', alignItems: 'center' },
  logoBlob: { width: 22, height: 22, borderRadius: '50%', border: '1.5px solid #1E1914' },
  wordmark: { fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' },
  envPill: {
    fontSize: 11, fontFamily: '"JetBrains Mono", monospace',
    padding: '3px 8px', background: '#1E1914', color: '#C6FF4A',
    borderRadius: 4, letterSpacing: '0.04em', textTransform: 'uppercase',
  },
  nav: { display: 'flex', gap: 26, fontSize: 14 },
  navLink: { color: '#6a5f53', cursor: 'pointer', fontWeight: 500, textDecoration: 'none' },
  rightTools: { display: 'flex', alignItems: 'center', gap: 14 },
  keyBadge: {
    display: 'flex', alignItems: 'center', gap: 8,
    fontFamily: '"JetBrains Mono", monospace', fontSize: 12,
    padding: '6px 10px', background: '#fff',
    border: '1.5px solid #1E1914', borderRadius: 6,
    boxShadow: '2px 2px 0 #1E1914',
    maxWidth: 220,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  keyDot: { width: 7, height: 7, borderRadius: '50%', background: '#7BB93C', flexShrink: 0 },
  avatar: {
    width: 32, height: 32, borderRadius: '50%',
    background: '#FF6B4A', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 600, fontSize: 14, border: '1.5px solid #1E1914',
  },

  main: { flex: 1, display: 'grid', gridTemplateColumns: '480px 1fr', minHeight: 0 },

  leftCol: {
    padding: '28px 28px 24px',
    borderRight: '1.5px solid #1E1914',
    display: 'flex', flexDirection: 'column', gap: 20,
    overflow: 'auto',
  },
  sectionHead: { display: 'flex', alignItems: 'center', gap: 12 },
  stepNum: {
    width: 28, height: 28, borderRadius: 6, background: '#FF6B4A', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: '"JetBrains Mono", monospace', fontSize: 12, fontWeight: 600,
    border: '1.5px solid #1E1914', flexShrink: 0,
  },
  sectionTitle: { fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em' },
  sectionSub: { fontSize: 12, color: '#6a5f53', marginTop: 1 },

  emptyDrop: {
    border: '2px dashed #1E1914', borderRadius: 12, background: '#fff',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '32px 20px', cursor: 'pointer',
    transition: 'background 0.15s, border-color 0.15s',
    minHeight: 140,
  },
  dropcard: {
    background: '#fff', border: '1.5px solid #1E1914', borderRadius: 12,
    boxShadow: '3px 3px 0 #1E1914', overflow: 'hidden',
  },
  dropPreview: { position: 'relative', background: '#E8D8C6', aspectRatio: '400/220' },
  dropMeta: {
    position: 'absolute', left: 12, right: 12, bottom: 12,
    background: 'rgba(255,255,255,0.95)',
    border: '1.5px solid #1E1914', borderRadius: 8, padding: '8px 10px',
  },
  metaRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  fileName: { fontFamily: '"JetBrains Mono", monospace', fontSize: 13, fontWeight: 500 },
  metaSub: { fontSize: 11, color: '#6a5f53', marginTop: 2, fontFamily: '"JetBrains Mono", monospace' },
  removeBtn: {
    background: 'transparent', border: 'none', cursor: 'pointer',
    fontSize: 14, color: '#6a5f53', padding: 0,
  },

  promptWrap: {
    background: '#fff', border: '1.5px solid #1E1914', borderRadius: 12,
    boxShadow: '3px 3px 0 #1E1914', padding: '12px 14px',
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  promptHead: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' },
  promptLabel: {
    fontSize: 12, fontFamily: '"JetBrains Mono", monospace',
    color: '#1E1914', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
  },
  promptHint: { fontSize: 11, color: '#6a5f53' },
  promptArea: {
    width: '100%', minHeight: 72, resize: 'vertical',
    border: '1.5px solid #1E1914', borderRadius: 6,
    padding: '10px 12px', fontFamily: '"Instrument Serif", Georgia, serif',
    fontSize: 16, lineHeight: 1.4, color: '#1E1914',
    outline: 'none', background: '#FAF5EB', boxSizing: 'border-box',
  },
  promptFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  promptChips: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  promptChip: {
    fontSize: 11, padding: '4px 9px',
    background: '#FAF5EB', border: '1.5px solid #1E1914', borderRadius: 20,
    fontFamily: 'inherit', cursor: 'pointer', color: '#1E1914', fontWeight: 500,
  },
  promptCount: {
    fontSize: 11, fontFamily: '"JetBrains Mono", monospace',
    color: '#6a5f53', whiteSpace: 'nowrap',
  },

  paramGrid: { display: 'flex', flexDirection: 'column', gap: 10 },
  paramRow: { display: 'flex', alignItems: 'center', gap: 14 },
  paramLabel: {
    width: 108, fontSize: 12, color: '#6a5f53',
    fontFamily: '"JetBrains Mono", monospace',
  },
  sliderRow: { display: 'flex', alignItems: 'center', gap: 12 },
  sliderVal: {
    fontFamily: '"JetBrains Mono", monospace', fontSize: 12,
    width: 44, textAlign: 'right',
  },

  runBtn: {
    marginTop: 'auto',
    padding: '14px 20px', background: '#C6FF4A', color: '#1E1914',
    border: '1.5px solid #1E1914', borderRadius: 8,
    fontFamily: 'inherit', fontSize: 15, fontWeight: 600,
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    boxShadow: '3px 3px 0 #1E1914',
  },
  runDot: { width: 8, height: 8, borderRadius: '50%', background: '#1E1914' },
  runShortcut: {
    marginLeft: 'auto', fontFamily: '"JetBrains Mono", monospace',
    fontSize: 11, background: '#1E1914', color: '#C6FF4A',
    padding: '2px 6px', borderRadius: 4,
  },

  rightCol: {
    padding: '28px 28px 24px',
    display: 'flex', flexDirection: 'column', gap: 18, minHeight: 0,
  },
  respHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  respTabs: {
    display: 'flex', gap: 0,
    border: '1.5px solid #1E1914', borderRadius: 8,
    background: '#fff', padding: 3, boxShadow: '2px 2px 0 #1E1914',
  },
  respTab: {
    padding: '7px 14px', border: 'none', background: 'transparent',
    fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
    cursor: 'pointer', borderRadius: 5, color: '#6a5f53',
  },
  respTabActive: { background: '#1E1914', color: '#FAF5EB' },
  statusGroup: { display: 'flex', gap: 8 },
  statusPill: {
    display: 'flex', alignItems: 'center', gap: 7,
    fontFamily: '"JetBrains Mono", monospace', fontSize: 11,
    padding: '5px 10px', background: '#FFE4DC', color: '#8C2F18',
    border: '1.5px solid #1E1914', borderRadius: 20,
  },
  pulseDot: {
    width: 7, height: 7, borderRadius: '50%',
    background: '#FF6B4A', animation: 'pc-pulse 1.2s ease-in-out infinite',
  },

  respBody: {
    flex: 1, background: '#fff',
    border: '1.5px solid #1E1914', borderRadius: 12,
    boxShadow: '3px 3px 0 #1E1914',
    padding: '24px 28px', minHeight: 300, overflow: 'auto',
  },
  captionText: {
    fontFamily: '"Instrument Serif", Georgia, serif',
    fontSize: 22, lineHeight: 1.45, color: '#1E1914',
    margin: 0, letterSpacing: '-0.005em',
  },
  caret: {
    display: 'inline-block', width: 2, height: 20,
    background: '#FF6B4A', marginLeft: 3, verticalAlign: -3,
    animation: 'pc-caret 0.9s steps(2) infinite',
  },
  editArea: {
    width: '100%', minHeight: 160, resize: 'vertical',
    fontFamily: '"Instrument Serif", Georgia, serif',
    fontSize: 22, lineHeight: 1.45, color: '#1E1914',
    border: '1.5px solid #2F6BFF', borderRadius: 8,
    padding: 12, outline: 'none', background: '#F6F9FF', boxSizing: 'border-box',
  },
  tagCloud: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  tagChip: {
    fontFamily: '"JetBrains Mono", monospace', fontSize: 13,
    padding: '6px 11px', background: '#FAF5EB',
    border: '1.5px solid #1E1914', borderRadius: 20, color: '#1E1914',
  },

  respFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  metaStats: {
    display: 'flex', gap: 18,
    fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: '#6a5f53',
  },
  metaStat: { display: 'flex', gap: 4 },
  actionRow: { display: 'flex', gap: 8 },
  iconBtn: {
    padding: '8px 14px', fontSize: 13, fontFamily: 'inherit', fontWeight: 500,
    background: '#fff', border: '1.5px solid #1E1914', borderRadius: 6,
    cursor: 'pointer', color: '#1E1914',
  },
  iconBtnPrimary: { background: '#1E1914', color: '#FAF5EB' },

  errorCard: {
    display: 'flex', alignItems: 'flex-start', gap: 12,
    padding: '12px 14px', background: '#FFF0CC',
    border: '1.5px solid #1E1914', borderRadius: 8,
    boxShadow: '2px 2px 0 #1E1914',
  },
  errorIcon: {
    width: 24, height: 24, borderRadius: 6, background: '#FFB020',
    color: '#1E1914', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: 14, border: '1.5px solid #1E1914', flexShrink: 0,
  },
  errorTitle: { fontSize: 13, fontWeight: 600 },
  errorSub: { fontSize: 12, color: '#4a3d2e', marginTop: 2 },
  errorDismiss: {
    background: 'transparent', border: 'none', cursor: 'pointer',
    fontSize: 14, color: '#6a5f53', padding: 4,
  },
};

window.PlaygroundConsole = PlaygroundConsole;