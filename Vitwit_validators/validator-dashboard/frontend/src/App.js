import React, { useEffect, useState, useMemo } from 'react';
import moment from 'moment';
import axios from 'axios';
import { Chart, registerables } from 'chart.js';
import 'chartjs-adapter-date-fns';
import {
  Container,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
  CircularProgress,
  useTheme,
  alpha,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Button,
  TextField,
  Alert,
  Snackbar,
  AppBar,
  Toolbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Chip
} from '@mui/material';
import { Line, Bar } from 'react-chartjs-2';
import { styled } from '@mui/material/styles';
import RefreshIcon from '@mui/icons-material/Refresh';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import TimelineIcon from '@mui/icons-material/Timeline';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import PeopleIcon from '@mui/icons-material/People';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import LogoutIcon from '@mui/icons-material/Logout';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

// API Base URL
const API_BASE = 'http://localhost:5000/api';

// Styled Components
const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: 12,
  boxShadow: '0 4px 20px 0 rgba(0,0,0,0.03)',
  transition: 'all 0.3s ease-in-out',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  '&:hover': {
    boxShadow: '0 8px 32px 0 rgba(0,0,0,0.08)'
  }
}));

const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  borderRadius: 12,
  border: `1px solid ${theme.palette.divider}`,
  '& .MuiTableHead-root': {
    backgroundColor: alpha(theme.palette.primary.main, 0.03),
    '& .MuiTableCell-head': {
      fontWeight: 600,
      color: theme.palette.text.secondary,
      textTransform: 'uppercase',
      fontSize: '0.75rem',
      letterSpacing: '0.5px',
      borderBottom: `1px solid ${theme.palette.divider}`
    }
  }
}));

const StyledSelect = styled(Select)(({ theme }) => ({
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.divider,
    borderRadius: 10,
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: alpha(theme.palette.primary.main, 0.5),
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.primary.main,
    boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
  },
  '& .MuiSelect-select': {
    padding: '12px 32px 12px 16px',
  },
}));

const ChartContainer = styled(Box)({
  height: 400,
  width: '100%',
  position: 'relative',
  padding: '16px 0',
});

const LoadingOverlay = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
  backdropFilter: 'blur(4px)',
  zIndex: 1,
  borderRadius: 12,
  color: theme.palette.text.secondary,
}));

const StatCard = styled(Card)(({ theme }) => ({
  height: '100%',
  borderRadius: 12,
  boxShadow: '0 4px 20px 0 rgba(0,0,0,0.03)',
  transition: 'all 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 8px 32px 0 rgba(0,0,0,0.08)'
  }
}));

const StatIcon = styled('div')(({ theme, color = 'primary' }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 56,
  height: 56,
  borderRadius: 12,
  backgroundColor: alpha(theme.palette[color].main, 0.1),
  color: theme.palette[color].main,
  marginBottom: theme.spacing(2),
  '& svg': {
    fontSize: 28,
  },
}));

const StatValue = styled(Typography)({
  fontWeight: 700,
  lineHeight: 1.2,
  margin: '8px 0 4px',
});

const StatLabel = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontSize: '0.875rem',
  fontWeight: 500,
}));

const LoginContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
  padding: theme.spacing(2),
}));

const LoginPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  borderRadius: 16,
  maxWidth: 450,
  width: '100%',
  boxShadow: '0 8px 32px 0 rgba(0,0,0,0.12)',
}));

const TIME_RANGES = [
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
  { label: '3 Months', value: '3m' },
  { label: '6 Months', value: '6m' },
  { label: '1 Year', value: '1y' }
];

// Auth Helper Functions
const getToken = () => localStorage.getItem('token');
const getUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};
const setAuth = (token, user) => {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
};
const clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

// Axios instance with auth
const createAxiosInstance = () => {
  const instance = axios.create({
    baseURL: API_BASE,
  });

  instance.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        clearAuth();
        window.location.reload();
      }
      return Promise.reject(error);
    }
  );

  return instance;
};

// Format numbers
const formatNumber = (input) => {
  if (input === null || input === undefined) return '0';

  if (typeof input === 'number') {
    return new Intl.NumberFormat('en-US').format(input);
  }

  if (typeof input === 'string') {
    const parts = input.trim().split(/\s+/);
    if (parts.length === 0) return '0';

    const numberStr = parts[0];
    const number = parseFloat(numberStr);
    if (isNaN(number)) return input;

    let formattedNumber;
    if (Math.abs(number) >= 1000000) {
      formattedNumber = new Intl.NumberFormat('en-US', {
        notation: 'compact',
        maximumFractionDigits: 2
      }).format(number);
    } else if (number % 1 !== 0) {
      const decimalPlaces = Math.min(6, (numberStr.split('.')[1] || '').length);
      formattedNumber = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimalPlaces
      }).format(number);
    } else {
      formattedNumber = new Intl.NumberFormat('en-US').format(number);
    }

    return parts.length > 1 ? `${formattedNumber} ${parts.slice(1).join(' ')}` : formattedNumber;
  }

  return '0';
};

// Chart options
const chartOptions = (theme) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
      align: 'end',
      labels: {
        usePointStyle: true,
        padding: 20,
        color: theme.palette.text.secondary,
        font: {
          family: theme.typography.fontFamily,
          size: 13,
        },
      },
    },
    tooltip: {
      mode: 'index',
      intersect: false,
      backgroundColor: theme.palette.background.paper,
      titleColor: theme.palette.text.primary,
      bodyColor: theme.palette.text.secondary,
      borderColor: theme.palette.divider,
      borderWidth: 1,
      padding: 16,
      callbacks: {
        label: function (context) {
          let label = context.dataset.label || '';
          if (label) {
            label += ': ';
          }
          if (context.parsed.y !== null) {
            label += formatNumber(context.parsed.y);
          }
          return label;
        }
      }
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
        drawBorder: false,
      },
      ticks: {
        maxRotation: 0,
        padding: 10,
        color: theme.palette.text.secondary,
      },
    },
    y: {
      grid: {
        borderDash: [3, 3],
        drawBorder: false,
        color: theme.palette.divider,
      },
      ticks: {
        padding: 10,
        color: theme.palette.text.secondary,
        callback: function (value) {
          return formatNumber(value);
        },
      },
    },
  },
  elements: {
    line: {
      tension: 0.3,
      borderWidth: 2,
      fill: 'start',
    },
    point: {
      radius: 3,
      hoverRadius: 6,
      hoverBorderWidth: 2,
      backgroundColor: theme.palette.background.paper,
      borderWidth: 2,
    },
  },
});

// Login Component
function LoginPage({ onLogin }) {
  const theme = useTheme();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const response = await axios.post(`${API_BASE}${endpoint}`, {
        username,
        password,
      });

      if (isRegister) {
        setSuccess('Registration successful! Please wait for admin approval.');
        setUsername('');
        setPassword('');
        setTimeout(() => setIsRegister(false), 2000);
      } else {
        setAuth(response.data.token, response.data.user);
        onLogin();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoginContainer>
      <LoginPaper elevation={3}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2,
            }}
          >
            {isRegister ? (
              <PersonAddIcon sx={{ fontSize: 32, color: theme.palette.primary.main }} />
            ) : (
              <LockOutlinedIcon sx={{ fontSize: 32, color: theme.palette.primary.main }} />
            )}
          </Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
            {isRegister ? 'Create Account' : 'Welcome Back'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isRegister
              ? 'Register for validator dashboard access'
              : 'Sign in to your validator dashboard'}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Username"
            variant="outlined"
            margin="normal"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoFocus
          />
          <TextField
            fullWidth
            label="Password"
            type="password"
            variant="outlined"
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            sx={{ mt: 3, mb: 2, py: 1.5, borderRadius: 2 }}
            disabled={loading}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : isRegister ? (
              'Register'
            ) : (
              'Sign In'
            )}
          </Button>

          <Box sx={{ textAlign: 'center' }}>
            <Button
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
                setSuccess('');
              }}
              color="primary"
            >
              {isRegister
                ? 'Already have an account? Sign in'
                : "Don't have an account? Register"}
            </Button>
          </Box>
        </form>


      </LoginPaper>
    </LoginContainer>
  );
}

// Admin Panel Component
function AdminPanel({ open, onClose }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const api = createAxiosInstance();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/users');
      setUsers(response.data);
    } catch (err) {
      setSnackbar({
        open: true,
        message: 'Failed to fetch users',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  const handleApprove = async (userId) => {
    try {
      await api.post(`/admin/users/${userId}/approve`);
      setSnackbar({
        open: true,
        message: 'User approved successfully',
        severity: 'success',
      });
      fetchUsers();
    } catch (err) {
      setSnackbar({
        open: true,
        message: 'Failed to approve user',
        severity: 'error',
      });
    }
  };

  const handleRevoke = async (userId) => {
    try {
      await api.post(`/admin/users/${userId}/revoke`);
      setSnackbar({
        open: true,
        message: 'User access revoked',
        severity: 'success',
      });
      fetchUsers();
    } catch (err) {
      setSnackbar({
        open: true,
        message: 'Failed to revoke user access',
        severity: 'error',
      });
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <AdminPanelSettingsIcon sx={{ mr: 1 }} />
            User Management
          </Box>
        </DialogTitle>
        <DialogContent>
          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : (
            <List>
              {users.map((user) => (
                <ListItem
                  key={user.id}
                  sx={{
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 2,
                    mb: 1,
                  }}
                >
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="subtitle1">{user.username}</Typography>
                        <Chip
                          label={user.role}
                          size="small"
                          color={user.role === 'admin' ? 'primary' : 'default'}
                        />
                        {user.approved ? (
                          <Chip label="Approved" size="small" color="success" />
                        ) : (
                          <Chip label="Pending" size="small" color="warning" />
                        )}
                      </Box>
                    }
                    secondary={`Created: ${new Date(user.createdAt).toLocaleDateString()}`}
                  />
                  <Box>
                    {!user.approved && user.role !== 'admin' && (
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        onClick={() => handleApprove(user.id)}
                        sx={{ mr: 1 }}
                      >
                        Approve
                      </Button>
                    )}
                    {user.approved && user.role !== 'admin' && (
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        onClick={() => handleRevoke(user.id)}
                      >
                        Revoke
                      </Button>
                    )}
                  </Box>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </>
  );
}

// Main Dashboard Component
function Dashboard() {
  const theme = useTheme();
  const api = createAxiosInstance();
  const user = getUser();

  const [networks, setNetworks] = useState([]);
  const [selectedNetwork, setSelectedNetwork] = useState('cosmos');
  const [range, setRange] = useState('30d');
  const [monthlyChartRange, setMonthlyChartRange] = useState('30d');
  const [data, setData] = useState([]);
  const [latest, setLatest] = useState(null);
  const [validatorList, setValidatorList] = useState([]);
  const [isLoading, setIsLoading] = useState({
    network: true,
    chart: true,
    validators: true
  });
  const [lastUpdated, setLastUpdated] = useState(null);
  const [allNetworksData, setAllNetworksData] = useState({});
  const [isLoadingAllNetworks, setIsLoadingAllNetworks] = useState(true);
  const [monthlyChartData, setMonthlyChartData] = useState([]);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);

  const handleLogout = () => {
    clearAuth();
    window.location.reload();
  };

  const fetchAllNetworksData = async () => {
    if (!networks.length) return;

    setIsLoadingAllNetworks(true);
    const allData = {};

    try {
      const networkPromises = networks.map(async (network) => {
        try {
          const res = await api.get(`/networks/${network}/history?range=${range}`);
          return { network, data: res.data || [] };
        } catch (err) {
          console.error(`Failed to fetch data for ${network}:`, err);
          return { network, data: [] };
        }
      });

      const results = await Promise.all(networkPromises);
      results.forEach(({ network, data }) => {
        allData[network] = data;
      });

      setAllNetworksData(allData);
    } catch (err) {
      console.error('Error fetching all networks data:', err);
    } finally {
      setIsLoadingAllNetworks(false);
    }
  };

  useEffect(() => {
    Chart.register(...registerables);
  }, []);

  const amountToUSD = (rawValue, network, rowPrice) => {
    if (rawValue === null || rawValue === undefined) return 0;

    let amount = 0;
    if (typeof rawValue === 'number') {
      amount = rawValue;
    } else if (typeof rawValue === 'string') {
      const trimmed = rawValue.trim();
      if (/\bUSD\b/i.test(trimmed)) {
        const num = parseFloat(trimmed.split(/\s+/)[0]);
        return isNaN(num) ? 0 : num;
      }
      const parts = trimmed.split(/\s+/);
      amount = parseFloat(parts[0]) || 0;
    } else {
      return 0;
    }

    if (rowPrice === undefined || rowPrice === null || rowPrice === 0 || String(rowPrice).trim() === '') {
      return 0;
    }

    const parsedPrice = parseFloat(rowPrice);
    if (isNaN(parsedPrice) || parsedPrice === 0) return 0;

    return parseFloat(amount) * parsedPrice;
  };

  const processSelfDelegationData = useMemo(() => {
    const datasets = [];
    const colors = [
      '#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f',
      '#edc948', '#b07aa1', '#ff9da7', '#9c755f', '#bab0ac'
    ];

    Object.entries(allNetworksData).forEach(([network, data], index) => {
      if (network.toLowerCase() === 'nomic' || !data.length) return;

      datasets.push({
        label: network.charAt(0).toUpperCase() + network.slice(1),
        data: data.map(d => ({
          x: new Date(d.timestamp),
          y: amountToUSD(d.self_delegations, network, d.price)
        })),
        borderColor: colors[index % colors.length],
        backgroundColor: 'transparent',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
      });
    });

    return { datasets };
  }, [allNetworksData]);

  const processExternalDelegationData = useMemo(() => {
    const datasets = [];
    const colors = [
      '#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f',
      '#edc948', '#b07aa1', '#ff9da7', '#9c755f', '#bab0ac'
    ];

    Object.entries(allNetworksData).forEach(([network, data], index) => {
      if (network.toLowerCase() === 'nomic' || !data.length) return;

      datasets.push({
        label: network.charAt(0).toUpperCase() + network.slice(1),
        data: data.map(d => ({
          x: new Date(d.timestamp),
          y: amountToUSD(d.external_delegations, network, d.price)
        })),
        borderColor: colors[index % colors.length],
        backgroundColor: 'transparent',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
      });
    });

    return { datasets };
  }, [allNetworksData]);

  const monthlyRewardsData = useMemo(() => {
    if (!monthlyChartData.length || !selectedNetwork || selectedNetwork === 'all') {
      return { labels: [], datasets: [], tokenSymbol: '' };
    }

    const monthlyGrouped = {};
    let tokenSymbol = '';

    monthlyChartData.forEach(row => {
      if (!row.total_rewards) return;
      const m = moment(row.timestamp).utc();
      const monthKey = `${m.year()}-${String(m.month() + 1).padStart(2, '0')}`;

      if (!monthlyGrouped[monthKey]) {
        monthlyGrouped[monthKey] = [];
      }
      monthlyGrouped[monthKey].push(row);

      if (!tokenSymbol && row.total_rewards) {
        const parts = row.total_rewards.split(' ');
        if (parts.length > 1) {
          tokenSymbol = parts[1];
        }
      }
    });

    const monthlyValues = [];
    const monthlyLabels = [];
    const isAvail = selectedNetwork.toLowerCase() === 'avail';

    const parseAmount = (s) => parseFloat((s || '0').toString().replace(/,/g, '').split(' ')[0]) || 0;
    const sortedMonths = Object.keys(monthlyGrouped).sort();

    sortedMonths.forEach((monthKey, index) => {
      const entries = monthlyGrouped[monthKey];
      entries.sort((a, b) => moment(a.timestamp).utc().valueOf() - moment(b.timestamp).utc().valueOf());

      let monthlyReward = 0;

      if (isAvail) {
        monthlyReward = entries.reduce((sum, entry) => {
          const amount = parseAmount(entry.total_rewards);
          return sum + amount;
        }, 0);
      } else {
        const lastRewardCurrentMonth = parseAmount(entries[entries.length - 1].total_rewards);

        let lastRewardPreviousMonth = 0;
        if (index > 0) {
          const prevMonthKey = sortedMonths[index - 1];
          const prevMonthEntries = monthlyGrouped[prevMonthKey];
          prevMonthEntries.sort((a, b) => moment(a.timestamp).utc().valueOf() - moment(b.timestamp).utc().valueOf());
          lastRewardPreviousMonth = parseAmount(prevMonthEntries[prevMonthEntries.length - 1].total_rewards);
        } else {
          lastRewardPreviousMonth = parseAmount(entries[0].total_rewards);
        }

        monthlyReward = lastRewardCurrentMonth - lastRewardPreviousMonth;
      }

      monthlyLabels.push(monthKey);
      monthlyValues.push(Math.max(0, monthlyReward));
    });

    return {
      labels: monthlyLabels,
      datasets: [
        {
          label: `Monthly Rewards${isAvail ? ' (Cumulative)' : ' (Delta)'} ${tokenSymbol}`,
          data: monthlyValues,
          backgroundColor: theme.palette.primary.main,
          borderColor: theme.palette.primary.dark,
          borderWidth: 1,
        }
      ]
    };
  }, [monthlyChartData, selectedNetwork, theme]);

  const fetchNetworks = async () => {
    try {
      const res = await api.get('/networks');
      setNetworks(res.data);
      if (res.data.length && !selectedNetwork) {
        setSelectedNetwork(res.data[0]);
      }
      setIsLoading(prev => ({ ...prev, network: false }));
    } catch (err) {
      console.error('Failed to fetch networks:', err);
      setIsLoading(prev => ({ ...prev, network: false }));
    }
  };

  const fetchValidatorList = async () => {
    if (!selectedNetwork) return;
    setIsLoading(prev => ({ ...prev, validators: true }));
    try {
      const res = await api.get(`/networks/${selectedNetwork}/latest`);
      setValidatorList(res.data || []);
    } catch (err) {
      console.error('Failed to fetch latest validator list:', err);
    } finally {
      setIsLoading(prev => ({ ...prev, validators: false }));
    }
  };

  const fetchNetworkData = async () => {
    if (!selectedNetwork) return;
    setIsLoading(prev => ({ ...prev, chart: true }));
    try {
      const res = await api.get(`/networks/${selectedNetwork}/history?range=${range}`);
      setData(res.data || []);
      if (res.data?.length) {
        setLatest(res.data[res.data.length - 1]);
      }
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch network history:', err);
    } finally {
      setIsLoading(prev => ({ ...prev, chart: false }));
    }
  };

  const fetchMonthlyChartData = async () => {
    if (!selectedNetwork) return;
    try {
      const mapToMonths = {
        '30d': 1,
        '3m': 3,
        '6m': 6,
        '1y': 12,
      };
      const months = mapToMonths[monthlyChartRange] || 1;
      const since = moment().utc().startOf('month').subtract(months - 1, 'months').toISOString();
      const res = await api.get(`/networks/${selectedNetwork}/history?since=${encodeURIComponent(since)}`);
      setMonthlyChartData(res.data || []);
    } catch (err) {
      console.error('Failed to fetch monthly chart data:', err);
    }
  };

  const handleRefresh = () => {
    fetchNetworks();
    fetchValidatorList();
    fetchNetworkData();
  };

  useEffect(() => {
    fetchNetworks();
  }, []);

  useEffect(() => {
    if (selectedNetwork) {
      fetchValidatorList();
      fetchNetworkData();
    }
    fetchAllNetworksData();
  }, [selectedNetwork, range]);

  useEffect(() => {
    if (selectedNetwork) {
      fetchMonthlyChartData();
    }
  }, [selectedNetwork, monthlyChartRange]);

  const topValidator = useMemo(() => {
    if (!validatorList.length) return null;
    return validatorList.reduce((max, v) => {
      const currentVal = parseFloat((v.self_delegations || '0').split(' ')[0]) || 0;
      const maxVal = parseFloat((max.self_delegations || '0').split(' ')[0]) || 0;
      return currentVal > maxVal ? v : max;
    }, validatorList[0]);
  }, [validatorList]);

  const chartData = useMemo(() => ({
    labels: data.map(d => d.timestamp && moment(d.timestamp).utc().format('MMM D')),
    datasets: [
      {
        label: 'Rewards',
        data: data.map(d => parseFloat((d.rewards || '0').split(' ')[0]) || 0),
        fill: true,
        backgroundColor: alpha(theme.palette.success.main, 0.1),
        borderColor: theme.palette.success.main,
        borderWidth: 2,
        tension: 0.3,
      },
      {
        label: 'Self Delegations',
        data: data.map(d => parseFloat((d.self_delegations || '0').split(' ')[0]) || 0),
        fill: true,
        backgroundColor: alpha(theme.palette.primary.main, 0.1),
        borderColor: theme.palette.primary.main,
        borderWidth: 2,
        tension: 0.3,
      },
      {
        label: 'External Delegations',
        data: data.map(d => parseFloat((d.external_delegations || '0').split(' ')[0]) || 0),
        fill: true,
        backgroundColor: alpha(theme.palette.secondary.main, 0.1),
        borderColor: theme.palette.secondary.main,
        borderWidth: 2,
        tension: 0.3,
      }
    ]
  }), [data, theme]);

  const totalRewardsChartData = useMemo(() => ({
    labels: data.map(d => d.timestamp && moment(d.timestamp).utc().format('MMM D')),
    datasets: [
      {
        label: 'Total Rewards',
        data: data.map(d => parseFloat((d.total_rewards || '0').split(' ')[0]) || 0),
        fill: true,
        backgroundColor: alpha(theme.palette.info.main, 0.08),
        borderColor: theme.palette.info.main,
        borderWidth: 2,
        tension: 0.3,
      }
    ]
  }), [data, theme]);

  const formatNetworkName = (network) => {
    if (network === 'all') return 'All Networks';
    return network.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <>
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <NetworkCheckIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
            Validator Dashboard
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip
              label={user?.username}
              color="primary"
              variant="outlined"
              size="small"
            />
            {user?.role === 'admin' && (
              <Tooltip title="User Management">
                <IconButton
                  color="inherit"
                  onClick={() => setAdminPanelOpen(true)}
                  size="small"
                >
                  <AdminPanelSettingsIcon />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Logout">
              <IconButton color="inherit" onClick={handleLogout} size="small">
                <LogoutIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700, color: 'text.primary' }}>
              Network Performance
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Monitor your validator's performance across multiple networks
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {lastUpdated && (
              <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                Last updated: {new Date(lastUpdated).toLocaleTimeString()}
              </Typography>
            )}
            <Tooltip title="Refresh data">
              <IconButton
                onClick={handleRefresh}
                size="small"
                sx={{
                  backgroundColor: 'action.hover',
                  '&:hover': {
                    backgroundColor: 'action.selected',
                  },
                }}
                disabled={Object.values(isLoading).some(Boolean)}
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Network and Time Range Selectors */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth size="small">
              <InputLabel id="network-select-label">Network</InputLabel>
              <StyledSelect
                labelId="network-select-label"
                value={selectedNetwork}
                label="Network"
                onChange={(e) => setSelectedNetwork(e.target.value)}
                disabled={isLoading.network}
                startAdornment={
                  <NetworkCheckIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />
                }
              >
                {networks.map(network => (
                  <MenuItem key={network} value={network}>
                    {formatNetworkName(network)}
                  </MenuItem>
                ))}
              </StyledSelect>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth size="small">
              <InputLabel id="time-range-label">Time Range</InputLabel>
              <StyledSelect
                labelId="time-range-label"
                value={range}
                label="Time Range"
                onChange={(e) => setRange(e.target.value)}
                disabled={isLoading.chart}
                startAdornment={
                  <TimelineIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />
                }
              >
                {TIME_RANGES.map(range => (
                  <MenuItem key={range.value} value={range.value}>
                    {range.label}
                  </MenuItem>
                ))}
              </StyledSelect>
            </FormControl>
          </Grid>
        </Grid>

        {/* Validator Address Card */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12}>
            <StatCard>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <StatIcon color="primary">
                    <AccountBalanceWalletIcon />
                  </StatIcon>
                  <Box ml={2} sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <StatLabel>Validator Address</StatLabel>
                    <StatValue variant="h6" sx={{ wordBreak: 'break-all', fontSize: '0.95rem' }}>
                      {isLoading.validators ? (
                        <Skeleton width="100%" animation="wave" />
                      ) : topValidator ? (
                        topValidator.validator_addr || 'N/A'
                      ) : (
                        'No validator data'
                      )}
                    </StatValue>
                  </Box>
                </Box>
              </CardContent>
            </StatCard>
          </Grid>
        </Grid>

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <StatIcon color="info">
                    <PeopleIcon />
                  </StatIcon>
                  <Box ml={2}>
                    <StatLabel>Self Delegations</StatLabel>
                    <StatValue variant="h5">
                      {isLoading.validators ? (
                        <Skeleton width={100} animation="wave" />
                      ) : topValidator?.self_delegations ? (
                        formatNumber(topValidator.self_delegations)
                      ) : (
                        'N/A'
                      )}
                    </StatValue>
                  </Box>
                </Box>
              </CardContent>
            </StatCard>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <StatIcon color="secondary">
                    <PeopleIcon />
                  </StatIcon>
                  <Box ml={2}>
                    <StatLabel>External Delegations</StatLabel>
                    <StatValue variant="h5">
                      {isLoading.validators ? (
                        <Skeleton width={100} animation="wave" />
                      ) : topValidator?.external_delegations ? (
                        formatNumber(topValidator.external_delegations)
                      ) : (
                        'N/A'
                      )}
                    </StatValue>
                  </Box>
                </Box>
              </CardContent>
            </StatCard>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <StatIcon color="success">
                    <EmojiEventsIcon />
                  </StatIcon>
                  <Box ml={2}>
                    <StatLabel>Total Pending Rewards</StatLabel>
                    <StatValue variant="h5">
                      {isLoading.validators ? (
                        <Skeleton width={100} animation="wave" />
                      ) : topValidator?.rewards ? (
                        formatNumber(topValidator.rewards)
                      ) : (
                        'N/A'
                      )}
                    </StatValue>
                  </Box>
                </Box>
              </CardContent>
            </StatCard>
          </Grid>
          {selectedNetwork !== 'all' && (
            <Grid item xs={12} sm={6} md={3}>
              <StatCard>
                <CardContent>
                  <Box display="flex" alignItems="center">
                    <StatIcon color="success">
                      <EmojiEventsIcon />
                    </StatIcon>
                    <Box ml={2}>
                      <StatLabel>Total Rewards</StatLabel>
                      <StatValue variant="h5">
                        {isLoading.chart ? (
                          <Skeleton width={100} animation="wave" />
                        ) : latest?.total_rewards ? (
                          formatNumber(latest.total_rewards)
                        ) : (
                          'N/A'
                        )}
                      </StatValue>
                    </Box>
                  </Box>
                </CardContent>
              </StatCard>
            </Grid>
          )}
        </Grid>

        {/* Chart */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12}>
            <StyledPaper>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
                  Delegation & Rewards History
                </Typography>
              </Box>
              <ChartContainer>
                {isLoading.chart ? (
                  <LoadingOverlay>
                    <CircularProgress size={24} sx={{ mr: 1 }} />
                    <Typography variant="body2" sx={{ mt: 1 }}>Loading chart data...</Typography>
                  </LoadingOverlay>
                ) : data.length === 0 ? (
                  <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: 'text.secondary',
                    p: 3,
                    textAlign: 'center'
                  }}>
                    <TimelineIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                    <Typography variant="body1" gutterBottom>No data available</Typography>
                  </Box>
                ) : (
                  <Line
                    data={chartData}
                    options={chartOptions(theme)}
                    height={400}
                  />
                )}
              </ChartContainer>
            </StyledPaper>
          </Grid>
        </Grid>

        {/* Total Rewards History */}
        {selectedNetwork !== 'all' && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12}>
              <StyledPaper>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
                    Total Rewards History
                  </Typography>
                </Box>
                <ChartContainer>
                  {isLoading.chart ? (
                    <LoadingOverlay>
                      <CircularProgress size={24} />
                    </LoadingOverlay>
                  ) : (
                    <Line
                      data={totalRewardsChartData}
                      options={chartOptions(theme)}
                      height={400}
                    />
                  )}
                </ChartContainer>
              </StyledPaper>
            </Grid>
          </Grid>
        )}

        {/* Monthly Rewards */}
        {selectedNetwork !== 'all' && selectedNetwork !== 'namada' && selectedNetwork !== 'nomic' && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12}>
              <StyledPaper>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
                      Monthly Rewards
                    </Typography>
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                      <InputLabel>Period</InputLabel>
                      <Select
                        value={monthlyChartRange}
                        label="Period"
                        onChange={(e) => setMonthlyChartRange(e.target.value)}
                      >
                        <MenuItem value="30d">1 Month</MenuItem>
                        <MenuItem value="3m">3 Months</MenuItem>
                        <MenuItem value="6m">6 Months</MenuItem>
                        <MenuItem value="1y">1 Year</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </Box>
                <ChartContainer>
                  {monthlyRewardsData.labels.length === 0 ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                      <Typography color="text.secondary">No data available</Typography>
                    </Box>
                  ) : (
                    <Bar data={monthlyRewardsData} options={chartOptions(theme)} height={400} />
                  )}
                </ChartContainer>
              </StyledPaper>
            </Grid>
          </Grid>
        )}

        {/* All Networks Charts */}
        {selectedNetwork === 'all' && (
          <>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12}>
                <StyledPaper>
                  <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                    Self Delegation Across All Networks
                  </Typography>
                  <ChartContainer>
                    {isLoadingAllNetworks ? (
                      <LoadingOverlay>
                        <CircularProgress size={24} />
                      </LoadingOverlay>
                    ) : (
                      <Line
                        data={processSelfDelegationData}
                        options={{
                          ...chartOptions(theme),
                          scales: {
                            ...chartOptions(theme).scales,
                            x: {
                              ...chartOptions(theme).scales.x,
                              type: 'time',
                              time: {
                                unit: 'day',
                                tooltipFormat: 'MMM d, yyyy',
                              }
                            }
                          }
                        }}
                        height={400}
                      />
                    )}
                  </ChartContainer>
                </StyledPaper>
              </Grid>
            </Grid>

            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12}>
                <StyledPaper>
                  <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                    External Delegation Across All Networks
                  </Typography>
                  <ChartContainer>
                    {isLoadingAllNetworks ? (
                      <LoadingOverlay>
                        <CircularProgress size={24} />
                      </LoadingOverlay>
                    ) : (
                      <Line
                        data={processExternalDelegationData}
                        options={{
                          ...chartOptions(theme),
                          scales: {
                            ...chartOptions(theme).scales,
                            x: {
                              ...chartOptions(theme).scales.x,
                              type: 'time',
                              time: {
                                unit: 'day',
                                tooltipFormat: 'MMM d, yyyy',
                              }
                            }
                          }
                        }}
                        height={400}
                      />
                    )}
                  </ChartContainer>
                </StyledPaper>
              </Grid>
            </Grid>
          </>
        )}
      </Container>

      {user?.role === 'admin' && (
        <AdminPanel open={adminPanelOpen} onClose={() => setAdminPanelOpen(false)} />
      )}
    </>
  );
}

// Main App Component
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!getToken());

  useEffect(() => {
    Chart.register(...registerables);
  }, []);

  if (!isAuthenticated) {
    return <LoginPage onLogin={() => setIsAuthenticated(true)} />;
  }

  return <Dashboard />;
}

export default App;