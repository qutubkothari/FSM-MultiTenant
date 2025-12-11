import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Chip,
  Paper,
  FormLabel,
  Checkbox,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  Send as SendIcon,
  Lightbulb as LightbulbIcon,
  TrendingUp as TrendingUpIcon,
  ShoppingCart as ShoppingCartIcon,
  CameraAlt as CameraIcon,
  Delete as DeleteIcon,
  // PhotoLibrary as GalleryIcon, // Commented for now
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';
import { visitService, productService, supabase } from '../../services/supabase';
import { aiService } from '../../services/ai.service';
import { useTranslation } from 'react-i18next';
import { autoTranslateBilingual } from '../../services/translationService';
import { plantService, Plant } from '../../services/plantService';
import { useTenantStore } from '../../store/tenantStore';
import { getBilingualDisplay } from '../../utils/arabicUtils';
import { offlineStorage } from '../../services/offlineStorage';

interface Props {
  onSuccess: () => void;
}

export default function NewVisitForm({ onSuccess }: Props) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const { user } = useAuthStore();
  const { tenant } = useTenantStore();
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [imageAnalysis, setImageAnalysis] = useState<any>(null);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [orderValueDialogOpen, setOrderValueDialogOpen] = useState(false);
  // const fileInputRef = useRef<HTMLInputElement>(null); // For gallery - commented for now
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    customer_name: '',
    contact_person: '',
    visit_type: 'personal' as 'personal' | 'telephone',
    meeting_type: [] as string[],
    products_discussed: [] as string[],
    next_action: [] as string[],
    next_action_date: '',
    potential: 'Medium' as 'High' | 'Medium' | 'Low',
    competitor_name: '',
    can_be_switched: null as boolean | null,
    remarks: '',
    location_lat: null as number | null,
    location_lng: null as number | null,
    location_address: '',
    time_in: new Date().toISOString(),
    visit_image: null as string | null,
    order_value: 0,
    plant: [] as string[],
  });

  const meetingTypes = [
    'introduction',
    'enquiry',
    'order',
    'payment',
    'followUp',
  ];

  const nextActionOptions = [
    'meeting',
    'sendSample',
    'visitAgainWithManagement',
    'commercialWIP',
    'closedOrder',
  ];

  useEffect(() => {
    const initData = async () => {
      await Promise.all([
        getLocation(),
        loadProducts(),
        loadSalesmanPlant()
      ]);
    };
    initData();
  }, []);

  useEffect(() => {
    if (tenant?.id) {
      loadPlants().then(() => setDataLoaded(true));
    }
  }, [tenant?.id]);

  const loadSalesmanPlant = async () => {
    if (!user?.phone) return;
    try {
      const { data: salesman } = await supabase
        .from('salesmen')
        .select('plant')
        .eq('phone', user.phone)
        .maybeSingle();
      
      if (salesman?.plant && Array.isArray(salesman.plant)) {
        setFormData(prev => ({ ...prev, plant: salesman.plant }));
      } else if (salesman?.plant) {
        // Handle old format (single plant as string)
        setFormData(prev => ({ ...prev, plant: [salesman.plant] }));
      }
    } catch (error) {
      console.error('Error loading salesman plant:', error);
    }
  };

  const loadPlants = async () => {
    try {
      if (!tenant?.id) {
        console.log('No tenant ID available');
        // Try to load from localStorage if offline
        const cached = localStorage.getItem(`plants_${tenant?.id || 'default'}`);
        if (cached) {
          console.log('Loading plants from cache (offline mode)');
          setPlants(JSON.parse(cached));
        }
        return;
      }
      console.log('Loading plants for tenant:', tenant.id);
      
      // Try to load from network first
      try {
        const data = await plantService.getPlants(tenant.id);
        console.log('Loaded plants:', data);
        setPlants(Array.isArray(data) ? data : []);
        // Cache for offline use
        localStorage.setItem(`plants_${tenant.id}`, JSON.stringify(data));
      } catch (networkError) {
        console.log('Network error loading plants, trying cache');
        // If network fails, try localStorage
        const cached = localStorage.getItem(`plants_${tenant.id}`);
        if (cached) {
          console.log('Loading plants from cache (network unavailable)');
          const cachedData = JSON.parse(cached);
          setPlants(Array.isArray(cachedData) ? cachedData : []);
        } else {
          throw networkError; // Re-throw if no cache available
        }
      }
    } catch (error) {
      console.error('Error loading plants:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const tenantId = useTenantStore.getState().tenant?.id;
      if (!tenantId) {
        // Try to load from localStorage if offline
        const cached = localStorage.getItem('products_cache');
        if (cached) {
          console.log('Loading products from cache (offline mode)');
          const cachedData = JSON.parse(cached);
          setProducts(Array.isArray(cachedData) ? cachedData : []);
        }
        return;
      }
      
      // Try to load from network first
      try {
        const data = await productService.getProducts(tenantId);
        console.log('Loaded products for NewVisitForm:', data);
        console.log('Sample product:', data[0]);
        setProducts(Array.isArray(data) ? data : []);
        // Cache for offline use
        localStorage.setItem('products_cache', JSON.stringify(data));
      } catch (networkError) {
        console.log('Network error loading products, trying cache');
        // If network fails, try localStorage
        const cached = localStorage.getItem('products_cache');
        if (cached) {
          console.log('Loading products from cache (network unavailable)');
          const cachedData = JSON.parse(cached);
          setProducts(Array.isArray(cachedData) ? cachedData : []);
        } else {
          throw networkError; // Re-throw if no cache available
        }
      }
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };

  const getLocation = () => {
    setGettingLocation(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          // Persist last known location for offline fallback
          localStorage.setItem('last_known_location', JSON.stringify({ lat, lng }));
          
          // Use reverse geocoding to get address
          let address = `${lat.toFixed(4)}, ${lng.toFixed(4)}`; // fallback to coordinates
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
              {
                headers: {
                  'User-Agent': 'Gazelle FSM App'
                }
              }
            );
            const data = await response.json();
            if (data && data.display_name) {
              address = data.display_name;
            }
          } catch (error) {
            console.error('Reverse geocoding failed:', error);
            // Keep fallback address
          }
          
          setFormData(prev => ({
            ...prev,
            location_lat: lat,
            location_lng: lng,
            location_address: address,
          }));
          setGettingLocation(false);
        },
        () => {
          // Stay silent to avoid revealing missing coordinates; user can still proceed
          setGettingLocation(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    } else {
      setError('Geolocation is not supported by your device.');
      setGettingLocation(false);
    }
  };

  // Quiet best-effort location fetch used right before saving
  const tryGetLocationQuietly = async () => {
    return new Promise<void>((resolve) => {
      if (!('geolocation' in navigator)) return resolve();
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          localStorage.setItem('last_known_location', JSON.stringify({ lat, lng }));
          setFormData(prev => ({
            ...prev,
            location_lat: lat,
            location_lng: lng,
            location_address: prev.location_address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          }));
          resolve();
        },
        () => resolve(),
        {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 0,
        }
      );
    });
  };

  // AI Intelligence: Load insights when customer name is entered
  useEffect(() => {
    // Debounce the AI insights loading to prevent interrupting typing
    const loadAIInsights = async () => {
      if (formData.customer_name.length < 3) {
        setAiInsights(null);
        setLoadingInsights(false);
        return;
      }

      setLoadingInsights(true);
      
      try {
        // Set a timeout to prevent infinite loading
        const timeoutId = setTimeout(() => {
          setLoadingInsights(false);
          console.warn('AI insights loading timed out');
        }, 5000); // 5 second timeout for faster response

        // Limit to recent 20 visits for customer lookup performance
        const allVisits = await visitService.getVisits(undefined, user?.phone, 20);
        const customerVisits = allVisits.filter((v: any) =>
          v.customer_name.toLowerCase().includes(formData.customer_name.toLowerCase())
        );

        clearTimeout(timeoutId); // Clear timeout if successful

        if (customerVisits.length > 0) {
          const productRecommendations = await aiService.getProductRecommendations(
            formData.customer_name,
            customerVisits
          );

          const lastVisit = customerVisits[0];
          const daysSinceLastVisit = Math.floor(
            (Date.now() - new Date(lastVisit.created_at).getTime()) / (1000 * 60 * 60 * 24)
          );

          setAiInsights({
            isExistingCustomer: true,
            totalVisits: customerVisits.length,
            lastVisitDate: new Date(lastVisit.created_at).toLocaleDateString(),
            daysSinceLastVisit,
            productRecommendations,
            visitHistory: customerVisits.slice(0, 3),
            suggestion: daysSinceLastVisit > 7 
              ? 'This customer hasn\'t been visited in a while. Consider a follow-up!' 
              : 'Recent customer - good timing for a follow-up visit.',
          });

          // Auto-fill contact person only (not customer name to avoid overwriting user input)
          // Customer can click on visit history to select exact customer
          if (lastVisit.contact_person && !formData.contact_person) {
            setFormData(prev => ({
              ...prev,
              contact_person: lastVisit.contact_person,
            }));
          }
        } else {
          setAiInsights({
            isExistingCustomer: false,
            suggestion: 'New customer! Make a great first impression.',
            productRecommendations: products.slice(0, 3).map(p => p.name),
          });
        }
      } catch (error) {
        console.error('Failed to load AI insights:', error);
      } finally {
        setLoadingInsights(false);
      }
    };

    // Debounce - wait 800ms after user stops typing
    const timeoutId = setTimeout(loadAIInsights, 800);
    return () => clearTimeout(timeoutId);
  }, [formData.customer_name, user, products]);

  const handleMeetingTypeChange = (type: string) => {
    setFormData(prev => {
      const currentTypes = prev.meeting_type;
      if (currentTypes.includes(type)) {
        // If unchecking 'order', reset order value
        if (type === 'order') {
          return { ...prev, meeting_type: currentTypes.filter(t => t !== type), order_value: 0 };
        }
        return { ...prev, meeting_type: currentTypes.filter(t => t !== type) };
      } else {
        // If checking 'order', open dialog to enter value
        if (type === 'order') {
          setOrderValueDialogOpen(true);
        }
        return { ...prev, meeting_type: [...currentTypes, type] };
      }
    });
  };

  const handleCaptureImage = () => {
    cameraInputRef.current?.click();
  };

  // const handleGalleryImage = () => {
  //   fileInputRef.current?.click();
  // };

  const analyzeImage = async (base64Image: string) => {
    setAnalyzingImage(true);
    try {
      // Get all previous visit images for duplicate detection
      const allVisits = await visitService.getVisits(undefined, user?.phone);
      const previousImages = allVisits
        .filter((v: any) => v.visit_image)
        .map((v: any) => v.visit_image);

      // Check for duplicate images
      const isDuplicate = previousImages.some((prevImg: string) => {
        // Simple hash comparison - in production, use perceptual hashing
        return prevImg === base64Image;
      });

      // Basic AI detection checks
      const analysis = {
        isDuplicate,
        isValid: true,
        warnings: [] as string[],
        score: 100,
      };

      if (isDuplicate) {
        analysis.warnings.push('⚠️ This image has been used in a previous visit');
        analysis.score -= 50;
        analysis.isValid = false;
      }

      // Check image metadata and characteristics
      const img = new Image();
      img.src = base64Image;
      await new Promise((resolve) => { img.onload = resolve; });

      // Check if image is too small (likely screenshot or fake)
      if (img.width < 400 || img.height < 400) {
        analysis.warnings.push('⚠️ Image resolution is suspiciously low');
        analysis.score -= 30;
      }

      // Check aspect ratio (AI-generated images often have perfect ratios)
      const aspectRatio = img.width / img.height;
      if (aspectRatio === 1 || aspectRatio === 2) {
        analysis.warnings.push('⚠️ Image has suspicious aspect ratio');
        analysis.score -= 20;
      }

      // Check file size (AI images are often smaller or larger than normal photos)
      const sizeKB = base64Image.length * 0.75 / 1024;
      if (sizeKB < 50 || sizeKB > 4000) {
        analysis.warnings.push('⚠️ Image file size is unusual for a photo');
        analysis.score -= 15;
      }

      setImageAnalysis(analysis);
      return analysis;
    } catch (error) {
      console.error('Image analysis failed:', error);
      return { isValid: true, warnings: [], score: 100 };
    } finally {
      setAnalyzingImage(false);
    }
  };

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = async (event: any) => {
        const base64String = event.target.result;
        setCapturedImage(base64String);
        setFormData(prev => ({
          ...prev,
          visit_image: base64String,
        }));

        // Analyze the image
        await analyzeImage(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setCapturedImage(null);
    setFormData(prev => ({
      ...prev,
      visit_image: null,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Last-chance quiet location attempt so we capture coords if possible
    await tryGetLocationQuietly();

    const customerName = (formData.customer_name || '').trim();
    const meetingTypesSelected = Array.isArray(formData.meeting_type) ? formData.meeting_type : [];

    if (!customerName || meetingTypesSelected.length === 0) {
      setError('Please fill in customer name and select at least one meeting type');
      return;
    }

    if (meetingTypesSelected.includes('Order') && (!formData.order_value || formData.order_value <= 0)) {
      setError('Please enter a valid order value');
      return;
    }

    // Photo and GPS are only mandatory for personal visits, not telephone calls
    if (formData.visit_type === 'personal') {
      if (!formData.visit_image) {
        setError('Please capture a photo of the location/office');
        return;
      }

      if (imageAnalysis && !imageAnalysis.isValid) {
        setError('Image verification failed. Please take a genuine photo at the location.');
        return;
      }

      if (imageAnalysis && imageAnalysis.score < 50) {
        setError('Image quality/authenticity score is too low. Please retake the photo.');
        return;
      }
    }

    setLoading(true);
    try {
      // Check if online
      const isOnline = navigator.onLine;
      
      if (!isOnline) {
        // OFFLINE MODE: Save to IndexedDB
        console.log('📡 Offline - saving visit to local storage');
        
        // Convert base64 data URL to Blob for IndexedDB storage
        let imageBlob = null;
        if (formData.visit_image) {
          try {
            const base64Data = formData.visit_image.split(',')[1];
            const byteCharacters = atob(base64Data);
            const byteArrays = [];
            for (let i = 0; i < byteCharacters.length; i++) {
              byteArrays.push(byteCharacters.charCodeAt(i));
            }
            imageBlob = new Blob([new Uint8Array(byteArrays)], { type: 'image/jpeg' });
            console.log('📷 Image converted to blob for offline storage, size:', imageBlob.size);
          } catch (error) {
            console.error('Failed to convert image:', error);
          }
        }

        // Auto-translate customer name, contact person, and remarks
        const [customerTranslation, contactTranslation, remarksTranslation] = await Promise.all([
          autoTranslateBilingual(formData.customer_name),
          autoTranslateBilingual(formData.contact_person || ''),
          autoTranslateBilingual(formData.remarks || '')
        ]);

        const offlineVisitData = {
          salesman_id: user?.id, // Will be mapped to actual salesman_id during sync
          customer_name: customerTranslation.english,
          customer_name_ar: customerTranslation.arabic,
          contact_person: contactTranslation.english || null,
          contact_person_ar: contactTranslation.arabic || null,
          remarks: remarksTranslation.english || null,
          remarks_ar: remarksTranslation.arabic || null,
          tenant_id: user?.tenant_id,
          plant: formData.plant,
          visit_type: formData.visit_type,
          meeting_type: formData.meeting_type,
          products_discussed: formData.products_discussed,
          next_action: formData.next_action,
          next_action_date: formData.next_action_date || null,
          potential: formData.potential,
          competitor_name: formData.competitor_name || null,
          can_be_switched: formData.can_be_switched,
          order_value: formData.order_value || null,
          location_lat: formData.location_lat,
          location_lng: formData.location_lng,
          location_address: formData.location_address,
          check_in_time: new Date().toISOString(),
          imageBlob: imageBlob, // Store as Blob for IndexedDB
          user_phone: user?.phone, // For salesman lookup during sync
          user_name: user?.name,
        };

        console.log('💾 Saving offline visit:', {
          customer: offlineVisitData.customer_name,
          hasImage: !!imageBlob,
          imageSize: imageBlob?.size,
          phone: user?.phone
        });

        await offlineStorage.saveVisitOffline(offlineVisitData);
        
        setSuccess(true);
        setTimeout(() => {
          onSuccess();
        }, 1500);
        return;
      }

      // ONLINE MODE: Normal submission
      // First, ensure the user exists in the salesmen table
      // This is needed because new users registered via the users table
      // need to have a corresponding salesman record for visits
      const { data: existingSalesman, error: fetchError } = await supabase
        .from('salesmen')
        .select('id')
        .eq('phone', user?.phone)
        .maybeSingle(); // Use maybeSingle() instead of single() to handle no rows gracefully

      let salesmanId = existingSalesman?.id;

      // If no existing salesman found (not an error), create one
      if (!existingSalesman && !fetchError) {
        console.log('Creating new salesman record for phone:', user?.phone);
        // Create salesman record if doesn't exist
        const { data: newSalesman, error: salesmanError } = await supabase
          .from('salesmen')
          .insert([
            {
              name: user?.name,
              phone: user?.phone,
              is_admin: user?.role === 'admin',
              is_active: true,
            },
          ])
          .select()
          .single();

        if (salesmanError) {
          console.error('Error creating salesman record:', salesmanError);
          throw new Error(`Failed to create salesman record: ${salesmanError.message}`);
        }

        if (!newSalesman) {
          throw new Error('Failed to create salesman record: No data returned');
        }

        salesmanId = newSalesman.id;
        console.log('Successfully created salesman with ID:', salesmanId);
      } else if (fetchError) {
        console.error('Error fetching salesman:', fetchError);
        throw new Error(`Failed to fetch salesman record: ${fetchError.message}`);
      }

      if (!salesmanId) {
        throw new Error('Failed to get or create salesman ID');
      }

      // Auto-translate customer name, contact person, and remarks
      const [customerTranslation, contactTranslation, remarksTranslation] = await Promise.all([
        autoTranslateBilingual(formData.customer_name),
        autoTranslateBilingual(formData.contact_person || ''),
        autoTranslateBilingual(formData.remarks || '')
      ]);

      // Clean up the data - convert empty strings to null for date fields
      const visitData = {
        salesman_id: salesmanId,
        salesman_name: user?.name,
        tenant_id: user?.tenant_id,
        ...formData,
        // Store both English and Arabic versions
        customer_name: customerTranslation.english,
        customer_name_ar: customerTranslation.arabic,
        contact_person: contactTranslation.english || null,
        contact_person_ar: contactTranslation.arabic || null,
        remarks: remarksTranslation.english || null,
        remarks_ar: remarksTranslation.arabic || null,
        next_action_date: formData.next_action_date || null, // Convert empty string to null
        time_out: new Date().toISOString(),
        status: 'completed',
      };

      console.log('Submitting visit with salesman_id:', salesmanId);
      await visitService.createVisit(visitData);
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err: any) {
      console.error('error adding visit', err);
      setError(err.message || 'Failed to create visit');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh" p={3}>
        <Alert severity="success" sx={{ fontSize: '1.1rem' }}>
          {t('visitAddedSuccess')} 🎉
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, pb: 10 }}>
      <Card sx={{ direction: isRTL ? 'rtl' : 'ltr' }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            📝 {t('newVisit')}
          </Typography>

          {formData.location_lat && (
            <Chip
              icon={<LocationIcon />}
              label={`${t('location')}: ${formData.location_address}`}
              color="success"
              size="small"
              sx={{ mb: 2 }}
            />
          )}

          <form onSubmit={handleSubmit}>
            {/* Hidden file inputs for camera and gallery */}
            <input
              type="file"
              ref={cameraInputRef}
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={handleImageCapture}
            />
            {/* Gallery upload - commented out for now */}
            {/* <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleImageCapture}
            /> */}

            {/* Customer Name */}
            <TextField
              fullWidth
              label={`${t('customerName')} *`}
              value={formData.customer_name}
              onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
              margin="normal"
              helperText={loadingInsights ? t('loading') : t('typeToAutoFill')}
            />


            {/* Plant Selection - Multiple */}
            {dataLoaded && (
            <FormControl fullWidth margin="normal">
              <InputLabel>{t('plants')}</InputLabel>
              <Select
                multiple
                value={Array.isArray(formData.plant) ? formData.plant : []}
                onChange={(e) => setFormData({ ...formData, plant: e.target.value as string[] })}
                label={t('plants')}
                renderValue={(selected) => {
                  if (!Array.isArray(selected)) return '';
                  const selectedNames = selected.map((id: string) => {
                    const plant = plants.find(p => p.id === id);
                    return plant ? getBilingualDisplay(plant.plant_name, plant.plant_name_ar, i18n.language === 'ar') : id;
                  });
                  return selectedNames.join(', ');
                }}
              >
                {Array.isArray(plants) && plants.map((plant) => {
                  const companyName = getBilingualDisplay(plant.plant_name, plant.plant_name_ar, i18n.language === 'ar');
                  const city = getBilingualDisplay(plant.city || '', plant.city_ar, i18n.language === 'ar');
                  return (
                    <MenuItem key={plant.id} value={plant.id}>
                      <Checkbox checked={Array.isArray(formData.plant) && formData.plant.includes(plant.id)} />
                      <ListItemText primary={`${companyName} (${plant.plant_code})${city ? ` - ${city}` : ''}`} />
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
            )}

            {/* AI Insights Panel */}
            {aiInsights && (
              <Paper 
                elevation={3} 
                sx={{ 
                  p: 2, 
                  mt: 2, 
                  mb: 2,
                  bgcolor: aiInsights.isExistingCustomer ? '#e3f2fd' : '#fff3e0',
                  border: '2px solid',
                  borderColor: aiInsights.isExistingCustomer ? '#2196f3' : '#ff9800',
                }}
              >
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <LightbulbIcon color={aiInsights.isExistingCustomer ? 'primary' : 'warning'} />
                  <Typography variant="subtitle1" fontWeight={600}>
                    🤖 {t('aiInsights')}
                  </Typography>
                </Box>

                <Alert severity={aiInsights.isExistingCustomer ? 'info' : 'warning'} sx={{ mb: 1 }}>
                  {aiInsights.suggestion}
                </Alert>

                {aiInsights.isExistingCustomer && (
                  <Box mb={1}>
                    <Typography variant="body2" gutterBottom>
                      <TrendingUpIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                      <strong>{t('history')}:</strong> {aiInsights.totalVisits} {t('visits')} | {t('lastVisitDate')}: {aiInsights.lastVisitDate} ({aiInsights.daysSinceLastVisit} {t('daysAgo')})
                    </Typography>
                  </Box>
                )}

                {aiInsights.productRecommendations && aiInsights.productRecommendations.length > 0 && (
                  <Box>
                    <Typography variant="body2" gutterBottom>
                      <ShoppingCartIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5}} />
                      <strong>{t('suggestedProducts')}:</strong>
                    </Typography>
                    <Box display="flex" gap={0.5} flexWrap="wrap">
                      {aiInsights.productRecommendations.map((product: string) => (
                        <Chip key={product} label={product} size="small" color="success" variant="outlined" />
                      ))}
                    </Box>
                  </Box>
                )}
              </Paper>
            )}

            {/* Contact Person */}
            <TextField
              fullWidth
              label={t('contactPerson')}
              value={formData.contact_person}
              onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
              margin="normal"
            />

            {/* Visit Type */}
            <FormControl component="fieldset" margin="normal" fullWidth>
              <FormLabel component="legend" sx={{ mb: 1 }}>{t('visitType')} *</FormLabel>
              <Box 
                sx={{ 
                  display: 'flex', 
                  gap: 1,
                }}
              >
                <Chip
                  label={`🚗 ${t('personalVisit')}`}
                  onClick={() => setFormData({ ...formData, visit_type: 'personal' })}
                  color={formData.visit_type === 'personal' ? 'primary' : 'default'}
                  variant={formData.visit_type === 'personal' ? 'filled' : 'outlined'}
                  sx={{ flex: 1, height: 50, fontSize: '0.95rem' }}
                />
                <Chip
                  label={`📞 ${t('telephoneVisit')}`}
                  onClick={() => setFormData({ ...formData, visit_type: 'telephone' })}
                  color={formData.visit_type === 'telephone' ? 'secondary' : 'default'}
                  variant={formData.visit_type === 'telephone' ? 'filled' : 'outlined'}
                  sx={{ flex: 1, height: 50, fontSize: '0.95rem' }}
                />
              </Box>
            </FormControl>

            {/* Meeting Type */}
            <FormControl component="fieldset" margin="normal" fullWidth>
              <FormLabel component="legend" sx={{ mb: 1 }}>{t('meetingType')} * {t('selectAllThatApply')}</FormLabel>
              <Box 
                sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: 1,
                }}
              >
                {meetingTypes.map((type) => (
                  <Chip
                    key={type}
                    label={t(type)}
                    onClick={() => handleMeetingTypeChange(type)}
                    color={formData.meeting_type.includes(type) ? 'primary' : 'default'}
                    variant={formData.meeting_type.includes(type) ? 'filled' : 'outlined'}
                    sx={{ 
                      height: 'auto',
                      py: 1,
                      '& .MuiChip-label': { 
                        whiteSpace: 'normal',
                        textAlign: 'center',
                      },
                    }}
                  />
                ))}
              </Box>
            </FormControl>

            {/* Products Discussed */}
            {dataLoaded && (
            <FormControl fullWidth margin="normal">
              <InputLabel>{t('productsDiscussed')}</InputLabel>
              <Select
                multiple
                value={Array.isArray(formData.products_discussed) ? formData.products_discussed : []}
                onChange={(e) => setFormData({ ...formData, products_discussed: e.target.value as string[] })}
                label={t('productsDiscussed')}
                renderValue={(selected) => {
                  if (!Array.isArray(selected)) return '';
                  const selectedNames = selected.map((id: string) => {
                    const product = products.find(p => p.id === id);
                    if (product) {
                      console.log('Rendering product:', product.name, 'Arabic:', product.name_ar, 'Language:', i18n.language);
                    }
                    return product ? getBilingualDisplay(product.name, product.name_ar, i18n.language === 'ar') : id;
                  });
                  return selectedNames.join(', ');
                }}
              >
                {Array.isArray(products) && products.map((product) => {
                  const displayName = getBilingualDisplay(product.name, product.name_ar, i18n.language === 'ar');
                  console.log('MenuItem product:', product.name, 'name_ar:', product.name_ar, 'display:', displayName, 'lang:', i18n.language);
                  return (
                    <MenuItem key={product.id} value={product.id}>
                      <Checkbox checked={Array.isArray(formData.products_discussed) && formData.products_discussed.includes(product.id)} />
                      <ListItemText primary={displayName} />
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
            )}

            {/* Next Action - Multiple Selection */}
            <FormControl fullWidth margin="normal">
              <InputLabel>{t('nextAction')}</InputLabel>
              <Select
                multiple
                value={Array.isArray(formData.next_action) ? formData.next_action : []}
                onChange={(e) => setFormData({ ...formData, next_action: e.target.value as string[] })}
                label={t('nextAction')}
                renderValue={(selected) => {
                  if (!Array.isArray(selected) || selected.length === 0) return t('none');
                  const selectedLabels = selected.map((action: string) => t(action));
                  return selectedLabels.join(', ');
                }}
              >
                {nextActionOptions.map((action) => (
                  <MenuItem key={action} value={action}>
                    <Checkbox checked={Array.isArray(formData.next_action) && formData.next_action.includes(action)} />
                    <ListItemText primary={t(action)} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Next Action Date */}
            {formData.next_action.length > 0 && (
              <TextField
                fullWidth
                type="date"
                label={t('nextActionDate')}
                value={formData.next_action_date}
                onChange={(e) => setFormData({ ...formData, next_action_date: e.target.value })}
                margin="normal"
                InputLabelProps={{ shrink: true }}
              />
            )}

            {/* Potential */}
            <FormControl component="fieldset" margin="normal" fullWidth>
              <FormLabel component="legend" sx={{ mb: 1 }}>{t('potential')} *</FormLabel>
              <Box 
                sx={{ 
                  display: 'flex', 
                  gap: 1,
                  flexWrap: 'wrap',
                }}
              >
                {['High', 'Medium', 'Low'].map((level) => (
                  <Chip
                    key={level}
                    label={t(level.toLowerCase())}
                    onClick={() => setFormData({ ...formData, potential: level as any })}
                    color={
                      formData.potential === level 
                        ? level === 'High' ? 'error' : level === 'Medium' ? 'warning' : 'info'
                        : 'default'
                    }
                    variant={formData.potential === level ? 'filled' : 'outlined'}
                    sx={{ 
                      flex: 1,
                      minWidth: '80px',
                      height: 40,
                    }}
                  />
                ))}
              </Box>
            </FormControl>

            {/* Competitor */}
            <TextField
              fullWidth
              label={t('currentlyWithCompetitor')}
              value={formData.competitor_name}
              onChange={(e) => setFormData({ ...formData, competitor_name: e.target.value })}
              margin="normal"
            />

            {/* Can be switched */}
            {formData.competitor_name && (
              <FormControl component="fieldset" margin="normal" fullWidth>
                <FormLabel component="legend" sx={{ mb: 1 }}>{t('canBeSwitchedQuestion')}</FormLabel>
                <Box 
                  sx={{ 
                    display: 'flex', 
                    gap: 1,
                  }}
                >
                  <Chip
                    label={t('yes')}
                    onClick={() => setFormData({ ...formData, can_be_switched: true })}
                    color={formData.can_be_switched === true ? 'success' : 'default'}
                    variant={formData.can_be_switched === true ? 'filled' : 'outlined'}
                    sx={{ flex: 1, height: 40 }}
                  />
                  <Chip
                    label={t('no')}
                    onClick={() => setFormData({ ...formData, can_be_switched: false })}
                    color={formData.can_be_switched === false ? 'error' : 'default'}
                    variant={formData.can_be_switched === false ? 'filled' : 'outlined'}
                    sx={{ flex: 1, height: 40 }}
                  />
                </Box>
              </FormControl>
            )}

            {/* Remarks */}
            <TextField
              fullWidth
              label={t('remarksNotes')}
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              margin="normal"
              multiline
              rows={3}
              placeholder={t('remarksPlaceholder')}
            />

            {/* Image Capture */}
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                📸 {t('photoOfLocation')} {formData.visit_type === 'personal' ? '*' : '(Optional)'}
              </Typography>
              
              {capturedImage ? (
                <Box>
                  <Box sx={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                    <img
                      src={capturedImage}
                      alt="Visit location"
                      style={{
                        width: '100%',
                        maxHeight: '300px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        border: imageAnalysis?.isValid ? '2px solid #43e97b' : '2px solid #ff6b6b',
                      }}
                    />
                  </Box>

                  {/* AI Analysis Results */}
                  {analyzingImage && (
                    <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <CircularProgress size={20} />
                        <Typography variant="body2">Analyzing image with AI...</Typography>
                      </Box>
                    </Box>
                  )}

                  {imageAnalysis && !analyzingImage && (
                    <Box sx={{ mt: 2 }}>
                      {imageAnalysis.isValid ? (
                        <Alert 
                          severity="success" 
                          icon={<CheckIcon />}
                          sx={{ mb: 2 }}
                        >
                          <Typography variant="body2" fontWeight={600}>
                            ✓ {t('imageVerified')} ({t('score')}: {imageAnalysis.score}/100)
                          </Typography>
                        </Alert>
                      ) : (
                        <Alert 
                          severity="error" 
                          icon={<WarningIcon />}
                          sx={{ mb: 2 }}
                        >
                          <Typography variant="body2" fontWeight={600}>
                            Image verification failed!
                          </Typography>
                          {imageAnalysis.warnings.map((warning: string, idx: number) => (
                            <Typography key={idx} variant="caption" display="block" sx={{ mt: 0.5 }}>
                              {warning}
                            </Typography>
                          ))}
                        </Alert>
                      )}
                    </Box>
                  )}

                  <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      startIcon={<DeleteIcon />}
                      onClick={handleRemoveImage}
                      fullWidth
                    >
                      {t('removeAndRetake')}
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Box>
                  <Button
                    variant="contained"
                    startIcon={<CameraIcon />}
                    onClick={handleCaptureImage}
                    fullWidth
                    sx={{ 
                      py: 1.5,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    }}
                  >
                    {t('takePhoto')}
                  </Button>
                  {/* Gallery option - commented out for now */}
                  {/* <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <Button
                      variant="contained"
                      startIcon={<CameraIcon />}
                      onClick={handleCaptureImage}
                      fullWidth
                      sx={{ 
                        py: 1.5,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      }}
                    >
                      Take Photo
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<GalleryIcon />}
                      onClick={handleGalleryImage}
                      fullWidth
                      sx={{ py: 1.5 }}
                    >
                      From Gallery
                    </Button>
                  </Box> */}
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                    📌 {t('aiWillVerify')}
                  </Typography>
                </Box>
              )}
            </Box>

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}

            <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={gettingLocation ? <CircularProgress size={20} /> : <LocationIcon />}
                onClick={getLocation}
                disabled={gettingLocation || loading}
              >
                {gettingLocation ? t('getting') : t('refreshGPS')}
              </Button>
              <Button
                fullWidth
                type="submit"
                variant="contained"
                endIcon={<SendIcon />}
                disabled={
                  loading || 
                  (formData.visit_type === 'personal' && (!formData.location_lat || !formData.visit_image))
                }
              >
                {loading ? t('submitting') : t('submitVisit')}
              </Button>
            </Box>
          </form>

          {/* Order Value Dialog */}
          <Dialog 
            open={orderValueDialogOpen} 
            onClose={() => {
              if (!formData.order_value || formData.order_value === 0) {
                // If user closes without entering value, uncheck order
                setFormData(prev => ({
                  ...prev,
                  meeting_type: prev.meeting_type.filter(t => t !== 'order')
                }));
              }
              setOrderValueDialogOpen(false);
            }}
            dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}
            PaperProps={{
              sx: {
                minWidth: { xs: '90vw', sm: '400px' },
                direction: i18n.language === 'ar' ? 'rtl' : 'ltr'
              }
            }}
          >
            <DialogTitle sx={{ textAlign: i18n.language === 'ar' ? 'right' : 'left' }}>
              {t('enterOrderValue')}
            </DialogTitle>
            <DialogContent>
              <TextField
                autoFocus
                margin="dense"
                label={t('orderValueRupees')}
                type="number"
                fullWidth
                value={formData.order_value || ''}
                onChange={(e) => setFormData({ ...formData, order_value: parseFloat(e.target.value) || 0 })}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>{tenant?.currencySymbol || '$'}</Typography>,
                }}
                helperText={t('enterOrderValueHelper')}
                sx={{
                  '& .MuiInputBase-root': {
                    direction: 'ltr'
                  }
                }}
              />
            </DialogContent>
            <DialogActions sx={{ 
              justifyContent: i18n.language === 'ar' ? 'flex-start' : 'flex-end',
              flexDirection: i18n.language === 'ar' ? 'row-reverse' : 'row'
            }}>
              <Button onClick={() => {
                // Cancel - uncheck order
                setFormData(prev => ({
                  ...prev,
                  meeting_type: prev.meeting_type.filter(t => t !== 'order'),
                  order_value: 0
                }));
                setOrderValueDialogOpen(false);
              }}>
                {t('cancel')}
              </Button>
              <Button onClick={() => {
                if (!formData.order_value || formData.order_value === 0) {
                  alert(t('pleaseEnterValidOrderValue'));
                  return;
                }
                setOrderValueDialogOpen(false);
              }} variant="contained">
                {t('ok')}
              </Button>
            </DialogActions>
          </Dialog>
        </CardContent>
      </Card>
    </Box>
  );
}
