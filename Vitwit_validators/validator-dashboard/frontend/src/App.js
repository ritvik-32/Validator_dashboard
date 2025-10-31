import React, { useEffect, useState, useMemo, useRef } from 'react';
import axios from 'axios';
import { Chart, registerables } from 'chart.js';
import { Chart as ChartJS } from 'chart.js';
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
  Divider,
  IconButton,
  Tooltip,
  Button
} from '@mui/material';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';
import { styled } from '@mui/material/styles';
import RefreshIcon from '@mui/icons-material/Refresh';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import TimelineIcon from '@mui/icons-material/Timeline';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import PeopleIcon from '@mui/icons-material/People';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

// Custom styled components
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
  },
  '& .MuiTableRow-root': {
    '&:nth-of-type(odd)': {
      backgroundColor: alpha(theme.palette.primary.main, 0.01),
    },
    '&:last-child td': {
      borderBottom: 0,
    },
    '&:hover': {
      backgroundColor: alpha(theme.palette.primary.main, 0.03),
    }
  },
  '& .MuiTableCell-body': {
    color: theme.palette.text.primary,
    borderBottom: `1px solid ${theme.palette.divider}`,
    padding: '12px 16px',
    '&.highlight': {
      fontWeight: 500,
      color: theme.palette.primary.main,
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

const StyledInputLabel = styled(InputLabel)(({ theme }) => ({
  color: theme.palette.text.secondary,
  '&.Mui-focused': {
    color: theme.palette.primary.main,
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
  },
  '& .MuiCardContent-root': {
    padding: theme.spacing(3),
    '&:last-child': {
      paddingBottom: theme.spacing(3),
    }
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

const NETWORKS_API = 'http://localhost:5000/api/networks';

const TIME_RANGES = [
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
  { label: '3 Months', value: '3m' },
  { label: '6 Months', value: '6m' },
  { label: '1 Year', value: '1y' }
];

// Format numbers with proper formatting and preserve token symbols
const formatNumber = (input) => {
  if (input === null || input === undefined) return '0';
  
  // If input is a number, format it directly
  if (typeof input === 'number') {
    return new Intl.NumberFormat('en-US').format(input);
  }
  
  // If input is a string, check if it contains a space (number + symbol)
  if (typeof input === 'string') {
    const parts = input.trim().split(/\s+/);
    if (parts.length === 0) return '0';
    
    // Parse the number part
    const numberStr = parts[0];
    const number = parseFloat(numberStr);
    if (isNaN(number)) return input; // Return original if not a valid number
    
    // Format the number part
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
    
    // Add the symbol back if it exists
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
      boxShadow: theme.shadows[3],
      titleFont: {
        weight: 600,
        size: 14,
        family: theme.typography.fontFamily,
      },
      bodyFont: {
        size: 13,
        family: theme.typography.fontFamily,
      },
      callbacks: {
        label: function(context) {
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
  interaction: {
    mode: 'nearest',
    axis: 'x',
    intersect: false,
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
        font: {
          size: 12,
        },
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
        font: {
          size: 12,
        },
        callback: function(value) {
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
  layout: {
    padding: {
      top: 10,
      right: 20,
      bottom: 10,
      left: 10,
    },
  },
  animation: {
    duration: 1000,
  },
  maintainAspectRatio: false,
  aspectRatio: 2,
});

function App() {
  const theme = useTheme();
  const [networks, setNetworks] = useState([]);
  const [selectedNetwork, setSelectedNetwork] = useState('cosmos');
  const [range, setRange] = useState('7d');
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

  // Fetch data for all networks
  const fetchAllNetworksData = async () => {
    if (!networks.length) return;
    
    setIsLoadingAllNetworks(true);
    const allData = {};
    
    try {
      // Fetch data for each network in parallel
      const networkPromises = networks.map(async (network) => {
        try {
          const res = await axios.get(`${NETWORKS_API}/${network}/history?range=${range}`);
          return { network, data: res.data || [] };
        } catch (err) {
          console.error(`Failed to fetch data for ${network}:`, err);
          return { network, data: [] };
        }
      });
      
      const results = await Promise.all(networkPromises);
      
      // Convert array of results to object with network names as keys
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

  // Register chart components
  useEffect(() => {
    Chart.register(...registerables);
  }, []);

  // Network token prices (in USD)
  const tokenPrices = {
    'avail': 0.00906833,
    'cosmos': 2.99,
    'regen': 0.00973236,
    'namada': 0.0098712,
    'mantra': 0.108471,
    'agoric': 0.01003554,
    'osmosis': 0.112654,
    'passage': 0.00098393,
    'akash': 0.715603,
    'cheqd': 0.01724347,
    'polygon': 0.187404,
    // Add other networks with their respective prices
  };

  // Helper function to convert token amount to USD
  const toUSD = (amount, network) => {
    const price = tokenPrices[network.toLowerCase()] || 1; // Default to 1 if price not found
    return parseFloat(amount) * price;
  };

  // Process data for self-delegation chart
  const processSelfDelegationData = useMemo(() => {
    const datasets = [];
    const colors = [
      '#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f',
      '#edc948', '#b07aa1', '#ff9da7', '#9c755f', '#bab0ac'
    ];
    
    Object.entries(allNetworksData).forEach(([network, data], index) => {
      if (!data.length) return;
      
      datasets.push({
        label: network.charAt(0).toUpperCase() + network.slice(1),
        data: data.map(d => {
          const amount = parseFloat((d.self_delegations || '0').split(' ')[0]) || 0;
          return {
            x: new Date(d.timestamp),
            y: toUSD(amount, network)
          };
        }),
        borderColor: colors[index % colors.length],
        backgroundColor: 'transparent',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBorderWidth: 2,
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: colors[index % colors.length],
        borderJoinStyle: 'round',
        borderCapStyle: 'round',
        fill: false
      });
    });
    
    return {
      datasets
    };
  }, [allNetworksData]);

  // Process data for external delegation chart
  const processExternalDelegationData = useMemo(() => {
    const datasets = [];
    const colors = [
      '#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f',
      '#edc948', '#b07aa1', '#ff9da7', '#9c755f', '#bab0ac'
    ];
    
    Object.entries(allNetworksData).forEach(([network, data], index) => {
      if (!data.length) return;
      
      datasets.push({
        label: network.charAt(0).toUpperCase() + network.slice(1),
        data: data.map(d => {
          const amount = parseFloat((d.external_delegations || '0').split(' ')[0]) || 0;
          return {
            x: new Date(d.timestamp),
            y: toUSD(amount, network)
          };
        }),
        borderColor: colors[index % colors.length],
        backgroundColor: 'transparent',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBorderWidth: 2,
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: colors[index % colors.length],
        borderJoinStyle: 'round',
        borderCapStyle: 'round',
        fill: false
      });
    });
    
    return {
      datasets
    };
  }, [allNetworksData]);

  const fetchNetworks = async () => {
    try {
      const res = await axios.get(NETWORKS_API);
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
      const res = await axios.get(`${NETWORKS_API}/${selectedNetwork}/latest`);
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
      const res = await axios.get(`${NETWORKS_API}/${selectedNetwork}/history?range=${range}`);
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

  // Get validator with highest self-delegation
  const topValidator = useMemo(() => {
    if (!validatorList.length) return null;
    return validatorList.reduce((max, v) => {
      const currentVal = parseFloat((v.self_delegations || '0').split(' ')[0]) || 0;
      const maxVal = parseFloat((max.self_delegations || '0').split(' ')[0]) || 0;
      return currentVal > maxVal ? v : max;
    }, validatorList[0]);
  }, [validatorList]);

  // Calculate total rewards
  const totalRewards = useMemo(() => {
    if (!validatorList.length) return 0;
    return validatorList.reduce((sum, v) => {
      return sum + (parseFloat((v.rewards || '0').split(' ')[0]) || 0);
    }, 0);
  }, [validatorList]);

  const chartData = useMemo(() => ({
    labels: data.map(d => d.timestamp && new Date(d.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    datasets: [
      {
        label: 'Rewards',
        data: data.map(d => parseFloat((d.rewards || '0').split(' ')[0]) || 0),
        fill: true,
        backgroundColor: alpha(theme.palette.success.main, 0.1),
        borderColor: theme.palette.success.main,
        borderWidth: 2,
        pointBackgroundColor: theme.palette.background.paper,
        pointBorderColor: theme.palette.success.main,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: theme.palette.success.main,
        pointHoverBorderColor: theme.palette.background.paper,
        pointHitRadius: 10,
        pointBorderWidth: 2,
        tension: 0.3,
      },
      {
        label: 'Self Delegations',
        data: data.map(d => parseFloat((d.self_delegations || '0').split(' ')[0]) || 0),
        fill: true,
        backgroundColor: alpha(theme.palette.primary.main, 0.1),
        borderColor: theme.palette.primary.main,
        borderWidth: 2,
        pointBackgroundColor: theme.palette.background.paper,
        pointBorderColor: theme.palette.primary.main,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: theme.palette.primary.main,
        pointHoverBorderColor: theme.palette.background.paper,
        pointHitRadius: 10,
        pointBorderWidth: 2,
        tension: 0.3,
      },
      {
        label: 'External Delegations',
        data: data.map(d => parseFloat((d.external_delegations || '0').split(' ')[0]) || 0),
        fill: true,
        backgroundColor: alpha(theme.palette.secondary.main, 0.1),
        borderColor: theme.palette.secondary.main,
        borderWidth: 2,
        pointBackgroundColor: theme.palette.background.paper,
        pointBorderColor: theme.palette.secondary.main,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: theme.palette.secondary.main,
        pointHoverBorderColor: theme.palette.background.paper,
        pointHitRadius: 10,
        pointBorderWidth: 2,
        tension: 0.3,
      }
    ]
  }), [data, theme]);

  const handleNetworkChange = (event) => {
    setSelectedNetwork(event.target.value);
  };

  const handleRangeChange = (event) => {
    setRange(event.target.value);
  };

  // Format network name for display
  const formatNetworkName = (network) => {
    if (network === 'all') return 'All Networks';
    return network.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700, color: 'text.primary' }}>
            Validator Dashboard
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
            <StyledInputLabel id="network-select-label">Network</StyledInputLabel>
            <StyledSelect
              labelId="network-select-label"
              id="network-select"
              value={selectedNetwork}
              label="Network"
              onChange={handleNetworkChange}
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
            <StyledInputLabel id="time-range-label">Time Range</StyledInputLabel>
            <StyledSelect
              labelId="time-range-label"
              id="time-range-select"
              value={range}
              label="Time Range"
              onChange={handleRangeChange}
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
        <Grid item xs={12} sm={6} md={4}>
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
        <Grid item xs={12} sm={6} md={4}>
          <StatCard>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
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
        <Grid item xs={12} sm={6} md={4}>
          <StatCard>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <StatIcon color="success">
                  <EmojiEventsIcon />
                </StatIcon>
                <Box ml={2}>
                  <StatLabel>Total Network Rewards</StatLabel>
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
      </Grid>

      {/* Chart */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <StyledPaper>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
                Delegation & Rewards History
              </Typography>
              {lastUpdated && (
                <Typography variant="caption" color="text.secondary">
                  Updated: {new Date(lastUpdated).toLocaleString()}
                </Typography>
              )}
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
                  <Typography variant="body2" color="text.secondary">
                    Select a different time range or check back later for updates.
                  </Typography>
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

      {/* Self Delegation Across All Networks */}
      {selectedNetwork === 'all' && (
        <>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12}>
              <StyledPaper>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
                    Self Delegation Across All Networks
                  </Typography>
                </Box>
                <ChartContainer>
                  {isLoadingAllNetworks ? (
                    <LoadingOverlay>
                      <CircularProgress size={24} sx={{ mr: 1 }} />
                      <Typography variant="body2" sx={{ mt: 1 }}>Loading network data...</Typography>
                    </LoadingOverlay>
                  ) : (
                    <Line 
                      data={processSelfDelegationData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: {
                          mode: 'index',
                          intersect: false,
                        },
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
                            boxShadow: theme.shadows[3],
                            titleFont: {
                              weight: 600,
                              size: 14,
                              family: theme.typography.fontFamily,
                            },
                            bodyFont: {
                              size: 13,
                              family: theme.typography.fontFamily,
                            },
                            callbacks: {
                              label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                  label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                  label += '$' + context.parsed.y.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                  });
                                }
                                return label;
                              }
                            }
                          }
                        },
                        scales: {
                          x: {
                            type: 'time',
                            time: {
                              unit: 'day',
                              tooltipFormat: 'MMM d, yyyy',
                              displayFormats: {
                                day: 'MMM d'
                              }
                            },
                            grid: {
                              display: false,
                              drawBorder: false,
                            },
                            ticks: {
                              maxRotation: 0,
                              padding: 10,
                              color: theme.palette.text.secondary,
                              font: {
                                size: 12,
                              },
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
                              font: {
                                size: 12,
                              },
                              callback: function(value) {
                                return '$' + value.toLocaleString(undefined, {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0
                                });
                              }
                            }
                          }
                        },
                        elements: {
                          line: {
                            tension: 0.4,
                            borderWidth: 2,
                          },
                          point: {
                            radius: 0,
                            hoverRadius: 6,
                            hoverBorderWidth: 2,
                            backgroundColor: '#fff',
                          },
                        },
                        layout: {
                          padding: {
                            top: 10,
                            right: 20,
                            bottom: 10,
                            left: 10,
                          },
                        },
                        animation: {
                          duration: 1000,
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
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
                    External Delegation Across All Networks
                  </Typography>
                </Box>
                <ChartContainer>
                  {isLoadingAllNetworks ? (
                    <LoadingOverlay>
                      <CircularProgress size={24} sx={{ mr: 1 }} />
                      <Typography variant="body2" sx={{ mt: 1 }}>Loading network data...</Typography>
                    </LoadingOverlay>
                  ) : (
                    <Line 
                      data={processExternalDelegationData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: {
                          mode: 'index',
                          intersect: false,
                        },
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
                            boxShadow: theme.shadows[3],
                            titleFont: {
                              weight: 600,
                              size: 14,
                              family: theme.typography.fontFamily,
                            },
                            bodyFont: {
                              size: 13,
                              family: theme.typography.fontFamily,
                            },
                            callbacks: {
                              label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                  label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                  label += '$' + context.parsed.y.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                  });
                                }
                                return label;
                              }
                            }
                          }
                        },
                        scales: {
                          x: {
                            type: 'time',
                            time: {
                              unit: 'day',
                              tooltipFormat: 'MMM d, yyyy',
                              displayFormats: {
                                day: 'MMM d'
                              }
                            },
                            grid: {
                              display: false,
                              drawBorder: false,
                            },
                            ticks: {
                              maxRotation: 0,
                              padding: 10,
                              color: theme.palette.text.secondary,
                              font: {
                                size: 12,
                              },
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
                              font: {
                                size: 12,
                              },
                              callback: function(value) {
                                return '$' + value.toLocaleString(undefined, {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0
                                });
                              }
                            }
                          }
                        },
                        elements: {
                          line: {
                            tension: 0.4,
                            borderWidth: 2,
                          },
                          point: {
                            radius: 0,
                            hoverRadius: 6,
                            hoverBorderWidth: 2,
                            backgroundColor: '#fff',
                          },
                        },
                        layout: {
                          padding: {
                            top: 10,
                            right: 20,
                            bottom: 10,
                            left: 10,
                          },
                        },
                        animation: {
                          duration: 1000,
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
  );
}

export default App;