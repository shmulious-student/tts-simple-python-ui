import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Button,
  CircularProgress,
  CssBaseline,
  ThemeProvider,
  createTheme,
  Alert,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DownloadIcon from '@mui/icons-material/Download';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
  },
});

const API_BASE_URL = `${process.env.REACT_APP_API_HOST || 'http://127.0.0.1'}:${process.env.REACT_APP_API_PORT || '8001'}`;

const sampleTexts = {
  English: [
    "The future of artificial intelligence is both exciting and daunting, promising to solve some of humanity's biggest challenges.",
    "A journey of a thousand miles begins with a single step. This ancient proverb reminds us to start small.",
    "Climate change requires urgent global cooperation. Renewable energy sources like solar and wind are key to a sustainable future.",
    "Reading books expands the mind and opens up new worlds. It is a timeless hobby that enriches the soul.",
  ],
  Hebrew: [
    "עתיד הבינה המלאכותית הוא מרגש ומאיים כאחד, ומבטיח לפתור כמה מהאתגרים הגדולים ביותר של האנושות.",
    "מסע של אלף מילין מתחיל בצעד אחד קטן. פתגם עתיק זה מזכיר לנו להתחיל בקטן, ולא לפחד מהדרך.",
    "שינויי האקלים דורשים שיתוף פעולה עולמי דחוף. מקורות אנרגיה מתחדשים כמו שמש ורוח הם המפתח לעתיד בר-קיימא.",
    "קריאת ספרים מרחיבה את הדעת ופותחת עולמות חדשים. זהו תחביב נצחי המעשיר את הנפש ומפתח את הדמיון.",
  ],
};

/**
 * Returns a random item from an array.
 * @param {Array<T>} arr The array to pick from.
 * @returns {T} A random item from the array.
 */
const getRandomItem = (arr) => {
  if (!arr || arr.length === 0) return '';
  return arr[Math.floor(Math.random() * arr.length)];
};

function App() {
  const [text, setText] = useState('');
  const [voicesConfig, setVoicesConfig] = useState({});
  const [selectedLang, setSelectedLang] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch voice configuration from the backend on component mount
    fetch(`${API_BASE_URL}/api/voices`)
      .then((res) => res.json())
      .then((data) => {
        setVoicesConfig(data);
        const defaultLang = 'Hebrew';
        setSelectedLang(defaultLang);
        setSelectedVoice(Object.keys(data[defaultLang])[1]); // Default to Dalia.

        // Set initial random text for the default language.
        setText(getRandomItem(sampleTexts[defaultLang]));
      })
      .catch(() => setError('Could not connect to the backend.'));
  }, []);

  const handleLanguageChange = (event) => {
    const lang = event.target.value;
    setSelectedLang(lang); // Set the new language.
    setSelectedVoice(Object.keys(voicesConfig[lang])[0]); // Set to the first available voice for the new language.

    // Set a new random text for the selected language.
    setText(getRandomItem(sampleTexts[lang]));
  };

  const synthesizeSpeech = useCallback(async (action) => {
    if (!text) {
      setError('Please enter some text to synthesize.');
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: selectedVoice }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to generate audio.');
      }

      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);

      if (action === 'play') {
        const audio = new Audio(audioUrl);
        audio.play();
        audio.onended = () => URL.revokeObjectURL(audioUrl);
      } else if (action === 'download') {
        const link = document.createElement('a');
        link.href = audioUrl;
        link.download = 'speech.mp3';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(audioUrl);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [text, selectedVoice]);

  const languages = Object.keys(voicesConfig);
  const voicesForLang = selectedLang ? voicesConfig[selectedLang] : {};

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Read Aloud (Hebrew/English) — Edge TTS
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ my: 4 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Language / שפה</InputLabel>
                <Select value={selectedLang} label="Language / שפה" onChange={handleLanguageChange}>
                  {languages.map((lang) => (
                    <MenuItem key={lang} value={lang}>{lang}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Voice / קול</InputLabel>
                <Select value={selectedVoice} label="Voice / קול" onChange={(e) => setSelectedVoice(e.target.value)}>
                  {Object.entries(voicesForLang).map(([voiceId, displayName]) => (
                    <MenuItem key={voiceId} value={voiceId}>{displayName}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>

        <TextField
          fullWidth
          multiline
          rows={10}
          label="Paste your text here / הדבק כאן את הטקסט"
          value={text}
          onChange={(e) => setText(e.target.value)}
          variant="outlined"
        />

        <Box sx={{ my: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button
            variant="contained"
            startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <PlayArrowIcon />}
            onClick={() => synthesizeSpeech('play')}
            disabled={isLoading}
            size="large"
          >
            Read Aloud
          </Button>
          <Button
            variant="outlined"
            startIcon={isLoading ? <CircularProgress size={20} /> : <DownloadIcon />}
            onClick={() => synthesizeSpeech('download')}
            disabled={isLoading}
            size="large"
          >
            Save as MP3
          </Button>
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default App;