import React, { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet } from 'react-native';

const Details: React.FC = () => {
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [response, setResponse] = useState<string>('');

  const sendData = async () => {
    try {
      const res = await fetch('http://192.168.7.10:3000/test', {  //DURING DEPLOYEMNT, DONT FORGWT TO REPLACE THIS WITH DEPLOMENT API
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });
      const json = await res.json();
      setResponse(JSON.stringify(json));
    } catch (error: any) {
      setResponse(`Error: ${error.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput placeholder="Name" onChangeText={setName} style={styles.input} />
      <TextInput placeholder="Email" onChangeText={setEmail} style={styles.input} />
      <Button title="Send to MongoDB" onPress={sendData} />
      <Text>{response}</Text>
    </View>
  );
};

export default Details;

const styles = StyleSheet.create({
  container: { padding: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    marginVertical: 10,
    padding: 8,
    borderRadius: 5,
  },
});
