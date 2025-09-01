import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Box,
  CircularProgress,
  createTheme,
  ThemeProvider,
  Alert,
  Paper,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  InputAdornment,
  Chip,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DownloadIcon from '@mui/icons-material/Download';
import SummarizeIcon from '@mui/icons-material/Summarize';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#61dafb',
    },
    background: {
      default: '#282c34',
      paper: '#3a3f4a',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
    },
    h5: {
      fontWeight: 600,
    },
  },
});

const API_BASE_URL = 'http://localhost:8001';

function App() {
  // State for TTS
  const [text, setText] = useState('');
  const [voicesConfig, setVoicesConfig] = useState({});
  const [selectedLang, setSelectedLang] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('');
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [error, setError] = useState('');

  // State for the AI Summarizer
  const [url, setUrl] = useState('');
  const [summarizerTargetLang, setSummarizerTargetLang] = useState('en');
  const [summaryLevel, setSummaryLevel] = useState('medium');
  const [detectedLang, setDetectedLang] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Fetch voice configuration from the backend on component mount
    fetch(`${API_BASE_URL}/api/voices`)
      .then((res) => {
        if (!res.ok) {
          throw new Error('Network response was not ok');
        }
        return res.json();
      })
      .then((data) => {
        setVoicesConfig(data);
        // Set default language and voice
        const firstLang = Object.keys(data)[0];
        if (firstLang) {
          setSelectedLang(firstLang);
          const firstVoice = Object.keys(data[firstLang])[0];
          setSelectedVoice(firstVoice);
        }
      })
      .catch((err) => {
        setError(`Failed to fetch voices: ${err.message}`);
      });
  }, []);

  const synthesizeSpeech = useCallback(async (action) => {
    if (!text.trim()) {
      setError('Please enter some text to synthesize.');
      return;
    }
    setIsSynthesizing(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: selectedVoice }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Synthesis failed.');
      }

      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);

      if (action === 'play') {
        const audio = new Audio(audioUrl);
        audio.play();
      } else if (action === 'download') {
        const link = document.createElement('a');
        link.href = audioUrl;
        link.download = 'speech.mp3';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSynthesizing(false);
    }
  }, [text, selectedVoice]);

  const handleProcessUrl = useCallback(async () => {
    if (!url.trim()) {
      setError('Please enter a URL.');
      return;
    }
    setIsProcessing(true);
    setError('');
    setDetectedLang('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/process-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          target_lang: summarizerTargetLang,
          summary_level: summaryLevel,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to process URL.');
      }

      const data = await response.json();
      setDetectedLang(data.detected_language);
      // Automatically copy the result to the TTS text area
      setText(data.processed_text);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  }, [url, summarizerTargetLang, summaryLevel]);

  const languages = Object.keys(voicesConfig);
  const voicesForLang = selectedLang ? voicesConfig[selectedLang] : {};

  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="md" sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          AI Summarizer & TTS
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            Article Summarizer
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Article URL"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isProcessing}
                placeholder="https://..."
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end" sx={{ pr: 1 }}>
                      {isProcessing && <CircularProgress size={24} />}
                      {detectedLang && !isProcessing && (
                        <Chip label={`Detected: ${detectedLang}`} size="small" variant="outlined" />
                      )}
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl>
                <FormLabel>Target Language</FormLabel>
                <RadioGroup row value={summarizerTargetLang} onChange={(e) => setSummarizerTargetLang(e.target.value)}>
                  <FormControlLabel value="en" control={<Radio />} label="English" />
                  <FormControlLabel value="he" control={<Radio />} label="Hebrew" />
                </RadioGroup>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl>
                <FormLabel>Summary Length</FormLabel>
                <RadioGroup row value={summaryLevel} onChange={(e) => setSummaryLevel(e.target.value)}>
                  <FormControlLabel value="short" control={<Radio />} label="Short" />
                  <FormControlLabel value="medium" control={<Radio />} label="Medium" />
                  <FormControlLabel value="long" control={<Radio />} label="Long" />
                </RadioGroup>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Button
                fullWidth
                variant="contained"
                onClick={handleProcessUrl}
                disabled={isProcessing || !url}
                startIcon={isProcessing ? <CircularProgress size={20} color="inherit" /> : <SummarizeIcon />}
              >
                {isProcessing ? 'Processing...' : 'Summarize & Translate'}
              </Button>
            </Grid>
          </Grid>
        </Paper>

        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            Text-to-Speech
          </Typography>

          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Language</InputLabel>
                <Select
                  value={selectedLang}
                  label="Language"
                  onChange={(e) => {
                    const newLang = e.target.value;
                    setSelectedLang(newLang);
                    // Set to the first available voice for the new language
                    const firstVoice = Object.keys(voicesConfig[newLang])[0];
                    setSelectedVoice(firstVoice);
                  }}
                >
                  {languages.map((lang) => (
                    <MenuItem key={lang} value={lang}>{lang}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth disabled={!selectedLang}>
                <InputLabel>Voice</InputLabel>
                <Select
                  value={selectedVoice}
                  label="Voice"
                  onChange={(e) => setSelectedVoice(e.target.value)}
                >
                  {Object.entries(voicesForLang).map(([voiceId, voiceName]) => (
                    <MenuItem key={voiceId} value={voiceId}>{voiceName}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <TextField
            fullWidth
            multiline
            rows={10}
            label="Text to read aloud / טקסט לקריאה"
            value={text}
            onChange={(e) => setText(e.target.value)}
            variant="outlined"
            sx={{ mt: 2 }}
          />

          <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="contained"
              startIcon={isSynthesizing ? <CircularProgress size={20} color="inherit" /> : <PlayArrowIcon />}
              onClick={() => synthesizeSpeech('play')}
              disabled={isSynthesizing || isProcessing}
              size="large"
            >
              Read Aloud
            </Button>
            <Button
              variant="outlined"
              startIcon={isSynthesizing ? <CircularProgress size={20} /> : <DownloadIcon />}
              onClick={() => synthesizeSpeech('download')}
              disabled={isSynthesizing || isProcessing}
              size="large"
            >
              Save as MP3
            </Button>
          </Box>
        </Paper>
      </Container>
    </ThemeProvider>
  );
}

export default App;