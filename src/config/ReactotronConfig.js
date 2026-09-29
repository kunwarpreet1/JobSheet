import Reactotron from 'reactotron-react-native';

const reactotron = Reactotron.configure({
  name: 'JobSheetFlow',
})
  .useReactNative({
    asyncStorage: false,
    networking: {
      ignoreUrls: /symbolicate/,
    },
    editor: false,
    errors: { veto: () => false },
    overlay: false,
  })
  .connect();

// Clear Reactotron on reload
Reactotron.clear();

// Attach Reactotron to console.tron for convenient debugging
console.tron = reactotron;

export default reactotron;
