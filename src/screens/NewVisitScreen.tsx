import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useVisitStore } from '@/store/visitStore';
import { useDataStore } from '@/store/dataStore';
import AIService from '@/services/ai.service';
import {
  MeetingType,
  NextActionType,
  PotentialLevel,
  VisitFormData,
} from '@/types/database.types';
import {
  MEETING_TYPES,
  NEXT_ACTION_TYPES,
  POTENTIAL_LEVELS,
} from '@/config/constants';

interface NewVisitScreenProps {
  navigation: any;
}

export const NewVisitScreen: React.FC<NewVisitScreenProps> = ({ navigation }) => {
  const { createVisit, startVisit, endVisit, isCreatingVisit } = useVisitStore();
  const { products, customers, fetchProducts, fetchCustomers, getOrCreateCustomer } = useDataStore();

  // Form state
  const [customerName, setCustomerName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [nextAction, setNextAction] = useState<NextActionType | undefined>();
  const [nextActionDate, setNextActionDate] = useState<Date | undefined>();
  const [potential, setPotential] = useState<PotentialLevel>('Medium');
  const [competitorName, setCompetitorName] = useState('');
  const [canBeSwitched, setCanBeSwitched] = useState<boolean | undefined>();
  const [remarks, setRemarks] = useState('');

  // AI suggestions
  const [customerSuggestions, setCustomerSuggestions] = useState<string[]>([]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);

  useEffect(() => {
    startVisit();
    fetchProducts();
    fetchCustomers();

    return () => {
      // Cleanup
    };
  }, []);

  // AI-powered customer name autocomplete
  const handleCustomerNameChange = async (text: string) => {
    setCustomerName(text);
    
    if (text.length >= 2) {
      // Simple filter from existing customers
      const filtered = customers
        .filter(c => c.name.toLowerCase().includes(text.toLowerCase()))
        .map(c => c.name)
        .slice(0, 5);
      
      setCustomerSuggestions(filtered);
      setShowCustomerSuggestions(true);

      // Optionally use AI for more intelligent suggestions
      // const aiSuggestions = await AIService.suggestCustomerName(
      //   text,
      //   customers.map(c => c.name)
      // );
      // setCustomerSuggestions(aiSuggestions);
    } else {
      setShowCustomerSuggestions(false);
    }
  };

  const selectCustomerSuggestion = (suggestion: string) => {
    setCustomerName(suggestion);
    setShowCustomerSuggestions(false);
    
    // Auto-fill contact person if available
    const customer = customers.find(c => c.name === suggestion);
    if (customer?.contact_person) {
      setContactPerson(customer.contact_person);
    }
  };

  const toggleMeetingType = (type: MeetingType) => {
    if (meetingTypes.includes(type)) {
      setMeetingTypes(meetingTypes.filter(t => t !== type));
    } else {
      setMeetingTypes([...meetingTypes, type]);
    }
  };

  const toggleProduct = (productId: string) => {
    if (selectedProducts.includes(productId)) {
      setSelectedProducts(selectedProducts.filter(p => p !== productId));
    } else {
      setSelectedProducts([...selectedProducts, productId]);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!customerName.trim()) {
      Alert.alert('Error', 'Please enter customer name');
      return;
    }

    if (meetingTypes.length === 0) {
      Alert.alert('Error', 'Please select at least one meeting type');
      return;
    }

    if (selectedProducts.length === 0) {
      Alert.alert('Error', 'Please select at least one product');
      return;
    }

    endVisit();

    const formData: VisitFormData = {
      customer_name: customerName.trim(),
      contact_person: contactPerson.trim() || undefined,
      meeting_type: meetingTypes,
      products_discussed: selectedProducts,
      next_action: nextAction,
      next_action_date: nextActionDate,
      potential,
      competitor_name: competitorName.trim() || undefined,
      can_be_switched: canBeSwitched,
      remarks: remarks.trim() || undefined,
    };

    // Get or create customer
    const customer = await getOrCreateCustomer(
      formData.customer_name,
      formData.contact_person
    );

    const success = await createVisit(formData, customer?.id);

    if (success) {
      Alert.alert(
        'Success',
        'Visit recorded successfully!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } else {
      Alert.alert('Error', 'Failed to record visit. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Visit</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Customer Name */}
        <View style={styles.section}>
          <Text style={styles.label}>Customer Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter customer name"
            value={customerName}
            onChangeText={handleCustomerNameChange}
            autoCapitalize="words"
          />
          {showCustomerSuggestions && customerSuggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              {customerSuggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestionItem}
                  onPress={() => selectCustomerSuggestion(suggestion)}
                >
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Contact Person */}
        <View style={styles.section}>
          <Text style={styles.label}>Contact Person</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter contact person name"
            value={contactPerson}
            onChangeText={setContactPerson}
            autoCapitalize="words"
          />
        </View>

        {/* Meeting Type */}
        <View style={styles.section}>
          <Text style={styles.label}>Meeting Type *</Text>
          <View style={styles.checkboxGroup}>
            {MEETING_TYPES.map(type => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.checkbox,
                  meetingTypes.includes(type) && styles.checkboxSelected,
                ]}
                onPress={() => toggleMeetingType(type)}
              >
                <Text
                  style={[
                    styles.checkboxText,
                    meetingTypes.includes(type) && styles.checkboxTextSelected,
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Products */}
        <View style={styles.section}>
          <Text style={styles.label}>Products Discussed *</Text>
          <View style={styles.checkboxGroup}>
            {products.map(product => (
              <TouchableOpacity
                key={product.id}
                style={[
                  styles.checkbox,
                  selectedProducts.includes(product.id) && styles.checkboxSelected,
                ]}
                onPress={() => toggleProduct(product.id)}
              >
                <Text
                  style={[
                    styles.checkboxText,
                    selectedProducts.includes(product.id) && styles.checkboxTextSelected,
                  ]}
                >
                  {product.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Next Action */}
        <View style={styles.section}>
          <Text style={styles.label}>Next Action</Text>
          <View style={styles.checkboxGroup}>
            {NEXT_ACTION_TYPES.map(action => (
              <TouchableOpacity
                key={action}
                style={[
                  styles.checkbox,
                  nextAction === action && styles.checkboxSelected,
                ]}
                onPress={() => setNextAction(action)}
              >
                <Text
                  style={[
                    styles.checkboxText,
                    nextAction === action && styles.checkboxTextSelected,
                  ]}
                >
                  {action}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Potential */}
        <View style={styles.section}>
          <Text style={styles.label}>Potential *</Text>
          <View style={styles.radioGroup}>
            {POTENTIAL_LEVELS.map(level => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.radioButton,
                  potential === level && styles.radioButtonSelected,
                ]}
                onPress={() => setPotential(level)}
              >
                <Text
                  style={[
                    styles.radioButtonText,
                    potential === level && styles.radioButtonTextSelected,
                  ]}
                >
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Competitor */}
        <View style={styles.section}>
          <Text style={styles.label}>Competitor Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Currently with competitor"
            value={competitorName}
            onChangeText={setCompetitorName}
            autoCapitalize="words"
          />
          {competitorName.trim() && (
            <View style={styles.switchContainer}>
              <TouchableOpacity
                style={[
                  styles.switchOption,
                  canBeSwitched === true && styles.switchOptionSelected,
                ]}
                onPress={() => setCanBeSwitched(true)}
              >
                <Text
                  style={[
                    styles.switchText,
                    canBeSwitched === true && styles.switchTextSelected,
                  ]}
                >
                  Can be switched
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.switchOption,
                  canBeSwitched === false && styles.switchOptionSelected,
                ]}
                onPress={() => setCanBeSwitched(false)}
              >
                <Text
                  style={[
                    styles.switchText,
                    canBeSwitched === false && styles.switchTextSelected,
                  ]}
                >
                  Cannot be switched
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Remarks */}
        <View style={styles.section}>
          <Text style={styles.label}>Remarks</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Additional notes..."
            value={remarks}
            onChangeText={setRemarks}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, isCreatingVisit && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isCreatingVisit}
        >
          {isCreatingVisit ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Visit</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    color: '#007AFF',
    fontSize: 16,
    width: 60,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 12,
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 100,
  },
  suggestionsContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginTop: 8,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  suggestionText: {
    fontSize: 14,
    color: '#333',
  },
  checkboxGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  checkbox: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  checkboxSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkboxText: {
    fontSize: 14,
    color: '#666',
  },
  checkboxTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  radioButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  radioButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  radioButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  radioButtonTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  switchContainer: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  switchOption: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  switchOptionSelected: {
    backgroundColor: '#34C759',
    borderColor: '#34C759',
  },
  switchText: {
    fontSize: 12,
    color: '#666',
  },
  switchTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    margin: 20,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonDisabled: {
    backgroundColor: '#999',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
