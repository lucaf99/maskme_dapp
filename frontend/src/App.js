import React, { useState, useEffect, useRef } from 'react';
import Web3 from 'web3';
import Webcam from 'react-webcam';
import axios from 'axios';
import DataMaskRegistry from './contracts/DataMaskRegistry.json';
import Soulbound from './contracts/Soulbound.json';
import './App.css';
import Container from 'react-bootstrap/Container';
import Navbar from 'react-bootstrap/Navbar';
import Button from 'react-bootstrap/Button';
import Badge from 'react-bootstrap/Badge';
import Stack from 'react-bootstrap/Stack';
import Form from 'react-bootstrap/Form';
import sfondo from './sfondo.png';
import logo from './logo.png';

function App() {
  // Variabili di stato per gestire dati dell'app
  const [photo, setPhoto] = useState(null); // Hash della foto caricata
  const [mask, setMask] = useState(null); // Hash della foto caricata
  const [changingPhoto, setChangingPhoto] = useState(false); // Indica se l'utente ha richiesto cambiamento foto
  const [token, setToken] = useState(false); 
  const [account, setAccount] = useState(''); // Indirizzo dell'account connesso
  const [web3, setWeb3] = useState(null); // Istanza Web3
  const [contractSoulbound, setContractSoulbound] = useState(null); // Istanza smart contract
  const [contractDataMask, setContractDataMask] = useState(null); // Istanza smart contract
  const [timestamp, setTimestamp] = useState(Date.now()); // Timestamp per prevenire cache nelle immagini
  const [isConnected, setIsConnected] = useState(false); // Variabile flag per verificare se l'utente è connesso
  const webcamRef = useRef(null); // Riferimento Webcam
  const [recipient, setRecipient] = useState(''); // Aggiunto per il destinatario del token

  // BASE_URL_IPFS Pinata configurabile 
  const IPFS_BASE_URL = 'IPFS_BASE_URL'; 

  // Caricamento dei dati se l'utente è già connesso
  useEffect(() => {
    const connectedAccount = localStorage.getItem('account');
    if (connectedAccount) {
      loadWeb3AndData(connectedAccount); // Carica i dati della blockchain se l'account è salvato in locale
    }
  }, []);

  // Rilevamento cambio account
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged); // Ascolta cambiamenti di account
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged); // Rimuove il listener 
      }
    };
  }, [account]);

  // Gestione cambio account
  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      // L'utente si è disconnesso
      alert('Sei bloccato o hai disconnesso il tuo account? Premi OK per essere reindirizzato alla schermata di login');
      handleLogout(); // Logout automatico
    } else if (accounts[0] !== account) {
      // L'utente ha cambiato account
      alert('Hai cambiato account? Premi OK per essere reindirizzato alla schermata di login');
      handleLogout(); // Logout automatico
    }
  };

  // Connessione a MetaMask e creazione istanza Web3
  const loadWeb3 = async () => {
    if (window.ethereum) {
      const web3 = new Web3(window.ethereum);
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' }); // Richiesta accesso account
        setWeb3(web3); // Setto l'istanza Web3
        console.log('Connessione riuscita');
        return web3;
      } catch (error) {
        console.error("Accesso negato dall'utente");
      }
    } else {
      window.alert('Nessuna connessione MetaMask');
    }
    return null;
  };

  // Funzione per caricare i dati della blockchain e verificare l'account
  const loadBlockchainData = async (web3, account) => {
    console.log('Caricamento Blockchain');
    const networkId = await web3.eth.net.getId(); // Recupera ID della rete
    const networkDataMaskRegistry = DataMaskRegistry.networks[networkId]; 
    console.log('Contratto DataMaskRegistry');
    if (networkDataMaskRegistry) { // Verifica se il contratto è deployato nella rete
      const contractDataMask = new web3.eth.Contract(DataMaskRegistry.abi, networkDataMaskRegistry.address);
      setContractDataMask(contractDataMask); // Imposta l'istanza del contratto
      try {
        if (web3.utils.isAddress(account)) {
          const maskData = await contractDataMask.methods.getMaskData(account).call(); // Recupera l'hash della foto e della maschera

          // Controlla che entrambi i valori non siano stringhe vuote
          if (maskData[0] !== "" && maskData[1] !== "") {
            console.log('DataMask già esistenti in Blockchain');
            console.log('CID Foto: ', maskData[0]);
            console.log('CID Maschera: ', maskData[1]);
            setPhoto(maskData[0]); 
            setMask(maskData[1]); 
          } else {
            console.log('MaskData non presenti su Blockchain');
          }

        } else {
          console.log('Indirizzo non valido');
        }
      } catch (error) {
        console.log('Errore recupero dati', error);
      }
    } else {
      window.alert('Smart contract DataMaskRegistry non deployato');
    }

    const networkSoulbound = Soulbound.networks[networkId]; 

    console.log('Contratto Soulbound');
    if (networkSoulbound) { // Verifica se il contratto soulbound è deployato nella rete
      const contractSoulbound = new web3.eth.Contract(Soulbound.abi, networkSoulbound.address);
      setContractSoulbound(contractSoulbound); // Imposta l'istanza del contratto
      try {
        if (web3.utils.isAddress(account)) {
          const token = await contractSoulbound.methods.getUserToken(account).call(); // Recupera token soulbound se esiste
          if (token.toString() !== '0') {
            console.log('Token già esistente su Blockchain');
            console.log('ID Token: ', token.toString());
            setToken(true); // Imposta il token se esiste
          } else {
            console.log('Token non presente su Blockchain'); 
          }
        } else {
          console.log('Indirizzo non valido');
        }
      } catch (error) {
        console.log('Errore recupero Token', error);
      }
    } else {
      window.alert('Smart contract Soulbound non deployato');
    }
  };

  // Funzione per caricare Web3 e i dati dell'account
  const loadWeb3AndData = async (account) => {
    const web3 = await loadWeb3();
    if (web3) {
      setAccount(account); // Imposta l'account connesso
      await loadBlockchainData(web3, account); // Carica i dati della blockchain
      setIsConnected(true); // Imposta l'utente come connesso
    }
  };

  // Funzione per effettuare il login tramite MetaMask
  const handleLogin = async () => {
    const web3 = await loadWeb3();
    if (web3) {
      const accounts = await web3.eth.getAccounts();
      const userAccount = accounts[0];
      if (userAccount) {
        setAccount(userAccount); // Salva l'account globale
        localStorage.setItem('account', userAccount); // Salva l'account in locale
      }
      await loadBlockchainData(web3, userAccount); // Carica i dati della blockchain
      setIsConnected(true); // Imposta l'utente come connesso
    }
  };

  // Funzione per effettuare il logout
  const handleLogout = () => {
    setIsConnected(false); // Disconnette l'utente
    setAccount(''); // Resetta l'account
    setPhoto(null); // Resetta CID della foto
    setMask(null); // Resetta CID della maschera
    setToken(false); // Resetta token
    setWeb3(null); // Resetta Web3
    setContractDataMask(null); // Resetta il contratto
    setContractSoulbound(null); // Resetta il contratto
    localStorage.removeItem('account'); // Rimuove l'account dalla memoria locale
    window.location.reload(); // Ricarica la pagina
  };

  // Funzione per catturare la foto dalla webcam
  const capturePhoto = async () => {
      const imageSrc = webcamRef.current.getScreenshot(); // Ottiene lo screenshot dalla webcam
      const blob = await fetch(imageSrc).then(res => res.blob()); // Converte l'immagine in Blob
    try {
      const maskData = await contractDataMask.methods.getMaskData(account).call(); // Conservo vecchi hash se esistono
      await saveTemporaryPhoto(blob);
      await runBlenderScript();
      await uploadIPFSandSaveOnBlockchain();
      if (maskData[0] !== "" && maskData[1] !== "") { // Unpin da Pinata vecchi file se esistenti
        console.log('Modifica Foto. Elimino i vecchi CID salvati su Blockchain')
        console.log('CID Foto da unpinnare', maskData[0]);
        console.log('CID Maschera da unpinnare', maskData[1]);
        await unpinFileFromIPFS(maskData[0]);
        await unpinFileFromIPFS(maskData[1]);
      }
      await burnToken();
      setChangingPhoto(false); // Setta il cambiamento foto concluso
      setTimestamp(Date.now()); // Aggiorna il timestamp per evitare cache delle immagini
    } catch (error) {
      console.error('Errore durante il processo di cattura della foto:', error);
    }
  };
  
  // Funzione per il salvataggio temporaneo della foto
  const saveTemporaryPhoto = async (blob) => {
    const formData = new FormData();
    formData.append('photo', blob); 

    try {
      const response = await axios.post('http://localhost:5000/saveTemporaryPhoto', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log('Foto caricata con successo:', response.data);
    } catch (error) {
      console.error('Errore durante il caricamento della foto:', error);
    }
  };

  // (SERVER) Funzione che richiama il server per il caricamento su IPFS e poi ci si occupa del salvataggio dei cid su blockchain
  const uploadIPFSandSaveOnBlockchain = async () => {
    try {
      const response = await axios.post('http://localhost:5000/uploadTemporaryFilesToIPFS', {
        account,
      });

      // Controlla se la risposta contiene i CID
      if (response.data.cids) {
        const cids = response.data.cids;

        // Cerca il CID della foto e della maschera
        const photocid = cids.find(item => item.file === `photo_${account}.png`); // Assegna il CID della foto
        const maskcid = cids.find(item => item.file === `mask_${account}.glb`); // Assegna il CID della maschera

        await contractDataMask.methods.setMaskData(photocid.cid, maskcid.cid).send({ from: account });
        setPhoto(photocid.cid);
        setMask(maskcid.cid);
      }
    } catch (error) {
      console.error('Errore durante il caricamento su IPFS:', error);
    }
  };

  // (SERVER) Funzione per unpinnare i file da Pinata
  const unpinFileFromIPFS = async (cid) => {
    try {
      const response = await fetch(`http://localhost:5000/unpinFileFromIPFS/${cid}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
  
      if (!response.ok) {
        throw new Error('Errore durante l\'unpinnamento del file da Pinata');
      }
  
      const data = await response.json();
      console.log('Risposta dal server:', data);
    } catch (error) {
      console.error('Errore:', error);
    }
  };

  
  const downloadFromIPFS = async (fileType) => {
    try {
      let filePath;
      let fileName;
  
      // Determina il percorso del file e il nome del file in base al tipo fornito
      if (fileType === 'photo') {
        filePath = `${IPFS_BASE_URL}${photo}`;
        fileName = `photo_${account}.png`; // Nome del file per l'immagine
      } else if (fileType === 'mask') {
        filePath = `${IPFS_BASE_URL}${mask}`; 
        fileName = `mask_${account}.glb`; // Nome del file per la maschera
      } else {
        console.error('Tipo di file non valido. Usa "photo" o "mask".');
        return; // Esce dalla funzione se il tipo di file non è valido
      }
  
      // Richiesta per scaricare il file associato all'account dell'utente
      const response = await axios.get(filePath, {
        responseType: 'blob',  // Riceve i dati come un oggetto Blob
      });
  
      console.log('Risposta del server:', response);
  
      if (response.data) {
        // Crea un URL temporaneo per il download del file
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName); // Assegna un nome al file da scaricare
        document.body.appendChild(link);
        link.click(); // Simula un clic per avviare il download
        link.parentNode.removeChild(link); // Rimuove il link dal DOM
      } else {
        console.error('Nessun dato ricevuto da IPFS');
      }
    } catch (error) {
      console.error('Errore durante il download del file', error);
    }
  };
  
  // (SERVER) Funzione per l'esecuzione dello script di blender
  const runBlenderScript = async () => {
    try {
      // Effettua una richiesta al server per eseguire lo script Blender
      const response = await fetch('http://localhost:5000/run-blender');
      const result = await response.text(); // Riceve il risultato dell'esecuzione dello script
      console.log(result);
    } catch (error) {
      console.error('Errore esecuzione comando Blender:', error);
    }
  };

  // Funzione per la creazione del token
  const createToken = async (photoCid, maskCid, account) => {
    try {
      const response = await axios.post('http://localhost:5000/createAndUploadMetadata', {
        photoCid,
        maskCid,
        account
      });
      
      // Recupera il CID restituito dal server
      const { cid } = response.data;
      console.log('CID Metadata', cid);
      const uri = `${IPFS_BASE_URL}${cid}`;
      await contractSoulbound.methods.safeMint(account, uri).send({ from: account });
      const tokenrecuperato = await contractSoulbound.methods.getUserToken(account).call(); // Recupera token soulbound se esiste
      if (tokenrecuperato.toString() !== '0') {
        console.log('Recupero Token');
        console.log('token', tokenrecuperato.toString());
        setToken(true); // Imposta il token se esiste
      } else {
        console.log('Nessun token trovato per l\'utente'); // Log per debug
        setToken(false); // Imposta il token a false se non esiste
      }
    } catch (error) {
      console.error('Errore durante l\'upload dei metadati:', error);
      throw error;
    }
  };

  // Burn del token soulbound
  const burnToken = async () => {
    try {
      const token_id = await contractSoulbound.methods.getUserToken(account).call();
      if(token_id.toString() !== '0'){
        console.log('Burn Token');
        const tokenUri = await contractSoulbound.methods.tokenURI(token_id).call();
        const cid = tokenUri.substring(tokenUri.lastIndexOf('/') + 1);
        console.log('cid', cid);
        await unpinFileFromIPFS(cid);
        await contractSoulbound.methods.burn(token_id).send({ from: account })
        setToken(false);
        const tokenrecuperato = await contractSoulbound.methods.getUserToken(account).call();
        if (tokenrecuperato.toString() !== '0') {
          console.log('Recupero Token');
          console.log('token', tokenrecuperato.toString());
          setToken(true); // Imposta il token se esiste
        } else {
          console.log('Nessun token trovato per l\'utente'); // Log debug
          setToken(false); // Imposta il token a false se non esiste
        }
        setRecipient('');
      }
    } catch (error) {
      console.error('Errore durante burn token', error);
    }
  }

  // Funzione prova trasferimento token
  const transferToken = async () => {
    try {
      if (!recipient) {
        alert("Per favore inserisci un indirizzo di destinatario.");
        return;
      }
      // Verifica che l'indirizzo del destinatario sia valido
      if (!web3.utils.isAddress(recipient)) {
        alert("Indirizzo destinatario non valido.");
        return;
      }

      const token_id = await contractSoulbound.methods.getUserToken(account).call();
      if (token_id.toString() !== '0') {
        await contractSoulbound.methods.safeTransferFrom(account, recipient, token_id).send({ from: account });
      } else {
        console.log('Nessun token trovato per l\'utente'); // Log per debug
        setToken(false); // Imposta il token a false se non esiste
      }
    } catch (error) {
      alert("Error: Revert reason: Token transfers are not allowed");
    }
  };

  return (
    <div>
      {account ? (
        <>
          <Navbar className="navbar-custom">
            <Container>
              <Navbar.Brand>
                <img
                  alt=""
                  src={logo}
                  width="30"
                  height="30"
                  className="d-inline-block align-top"
                />{' '}
                <span className="text-white fw-bold">MaskMe</span>
              </Navbar.Brand>
              <Navbar.Toggle />
              <Navbar.Collapse className="justify-content-end">
                <Stack direction="horizontal" gap={3}>
                  <div>
                    <span className="text-white">Logged as </span>{' '}
                    <Badge bg="success">{account}</Badge>
                  </div>
                  <Button variant="outline-light" onClick={handleLogout}>Logout</Button>
                </Stack>
              </Navbar.Collapse>
            </Container>
          </Navbar>
          <div>
            {changingPhoto || !photo ? (
              <div className="container-centered">
                <div className="content">
                  <h1>Scatta la tua foto per la maschera</h1>
                  <div className="webcam-container">
                    <div className="overlay-container">
                      <Webcam
                        audio={false}
                        ref={webcamRef}
                        screenshotFormat="image/png"
                        width={400}
                        height={300}
                        className="webcam"
                      />
                      <img src={require('./FaceOverlay.png')} alt="overlay" className="overlay"/>
                    </div>
                    <br></br>
                    <div>
                      <Button variant="success" onClick={capturePhoto}>Scatta Foto</Button>{' '}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="container-centered">
                <div className="content">
                  <h1>Questa è l'ultima foto che hai scattato</h1>
                  <img
                    src={`${IPFS_BASE_URL}${photo}`}
                    width={400}
                    height={300}
                    alt="Immagine"
                    className="image-border"
                  />
                  <br></br>
                  <span className="fw-bold">CID Foto: </span> {photo}
                  <br></br><br></br>
                  <span className="fw-bold">CID Maschera: </span> {mask}
                  <br></br><br></br>
                  <div>
                    <Button variant="success" onClick={() => setChangingPhoto(true)}>Modifica Foto</Button>
                  </div>
                  <br></br>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Button variant="success" onClick={() => downloadFromIPFS('photo')}>Scarica Foto</Button>
                    <Button variant="success" onClick={() => downloadFromIPFS('mask')}>Scarica Maschera</Button>
                  </div>
                  <br></br>
                  {!token ? (
                  <div>
                    <Button variant="primary" onClick={() => createToken(photo, mask, account)}>Crea Token Soulbound</Button>{' '}
                  </div>
                  ):(
                    <div>
                      <span className="fw-bold">Token creato. Operazioni su token:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '25px' }}>
                        <Form style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Form.Group controlId="formRecipient" style={{ marginBottom: 0 }}>
                            <Form.Control
                              type="text"
                              placeholder="Address Destinatario"
                              value={recipient}
                              onChange={(e) => setRecipient(e.target.value)} // Aggiorna il destinatario
                            />
                          </Form.Group>
                          <Button variant="primary" onClick={transferToken}>Trasferisci Token</Button>
                        </Form>
                        <Button variant="primary" onClick={() => burnToken()}>Elimina Token</Button>
                        <br/><br/><br/><br/>
                      </div>
                    </div>

                  )}
                </div>
              </div>
            )}
          </div>
        </>
      ) : ( 
        <>
          <Navbar className="navbar-custom">
            <Container>
              <Navbar.Brand>
                <img
                  alt=""
                  src={logo}
                  width="30"
                  height="30"
                  className="d-inline-block align-top"
                />{' '}
                <span className="text-white fw-bold">MaskMe</span>
              </Navbar.Brand>
              <Navbar.Toggle />
              <Navbar.Collapse className="justify-content-end">
                <Button variant="success" onClick={handleLogin}>Accedi con MetaMask</Button>
              </Navbar.Collapse>
            </Container>
          </Navbar>
          <div className="full-screen-image">
            <img  src={sfondo}  alt="Sfondo" style={{ width: '100%', height: '94vh', objectFit: 'cover' }}/>
          </div>
        </>
      )}
    </div>
  );
  }

  export default App;


