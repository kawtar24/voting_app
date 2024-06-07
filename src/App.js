
import 'bootstrap/dist/css/bootstrap.min.css';
import { useEffect, useState } from "react";
import Voting from "./Voting.json";
import { ethers } from "ethers";
import axios from "axios";


const ContractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

function VotingPage() {
  const [candidates, setCandidates] = useState([]);
  const [signer, setSigner] = useState(null);
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [numberCandidates, setNumberCandidates] = useState(0);
  const [candidateName, setCandidateName] = useState("");
  const [manifestoFile, setManifestoFile] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [owner, setOwner] = useState(null);



  useEffect(() => {
    init();
  }, []);

  async function loadCandidates(contract) {
    try {
      const candidatesCount = await contract.candidatesCount();
      const candidateArray = [];
      for (let i = 0; i < candidatesCount; i++) {
        const candidate = await contract.candidates(i);
        candidateArray.push({
          name: candidate.name,
          manifestoIpfsHash: candidate.manifestoIpfsHash,
          imageIpfsHash: candidate.imageIpfsHash,
          voteCount: candidate.voteCount.toString(),
        });
      }
      setCandidates(candidateArray);
    } catch (error) {
      console.error("Error loading candidates:", error);
    }
  }

  async function init() {
    try {
      if (typeof window.ethereum !== "undefined") {
        await window.ethereum.request({ method: "eth_requestAccounts" });
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(
          ContractAddress,
          Voting.abi,
          signer
        );
        const account = await signer.getAddress();
        const owner = await contract.getOwner();
        const nbrCadidates = await contract.getNumberOfCandidates();
        const bigNumber = ethers.BigNumber.from(nbrCadidates._hex);
        const number = bigNumber.toNumber();
        setAccount(account);
        setSigner(signer);
        setProvider(provider);
        setContract(contract);
        setNumberCandidates(number);
        setOwner(owner);
        await loadCandidates(contract);
      }
    } catch (error) {
      console.error("Error initializing app:", error);
    }
  }

  async function vote(candidateIndex) {
    if (contract) {
      try {
        const tx = await contract.vote(candidateIndex);
        await tx.wait();
        await loadCandidates(contract); // Refresh the candidates list after voting
      } catch (error) {
        console.error("An unexpected error occurred:", error);
      }
    }
  }

  async function addCandidate() {
    if (contract && manifestoFile && imageFile) {
      try {
        // Upload manifesto file to Pinata
        const manifestoFormData = new FormData();
        manifestoFormData.append("file", manifestoFile);
        const manifestoResponse = await axios.post(
          "https://api.pinata.cloud/pinning/pinFileToIPFS",
          manifestoFormData,
          {
            maxBodyLength: "Infinity",
            headers: {
              "Content-Type": `multipart/form-data; boundary=${manifestoFormData._boundary}`,
              pinata_api_key: "08c4f56fe9e4dd777a94", 
              pinata_secret_api_key:
                "8136a28cd6a2f0b3e94a5039db8f00d77eb1016afd6a8790b883c033c79a3881", 
            },
          }
        );
        const manifestoIpfsHash = manifestoResponse.data.IpfsHash;

        // Upload image file to Pinata
        const imageFormData = new FormData();
        imageFormData.append("file", imageFile);
        const imageResponse = await axios.post(
          "https://api.pinata.cloud/pinning/pinFileToIPFS",
          imageFormData,
          {
            maxBodyLength: "Infinity",
            headers: {
              "Content-Type": `multipart/form-data; boundary=${imageFormData._boundary}`,
              pinata_api_key: "08c4f56fe9e4dd777a94", 
              pinata_secret_api_key:
                "8136a28cd6a2f0b3e94a5039db8f00d77eb1016afd6a8790b883c033c79a3881", 
            },
          }
        );
        const imageIpfsHash = imageResponse.data.IpfsHash;

        const tx = await contract.addCandidate(
          candidateName,
          manifestoIpfsHash,
          imageIpfsHash
        );
        await tx.wait();
        await loadCandidates(contract);
        const nbrCadidates = await contract.getNumberOfCandidates();
        const bigNumber = ethers.BigNumber.from(nbrCadidates._hex);
        const number = bigNumber.toNumber();
        setNumberCandidates(number);
      } catch (error) {
        console.error("Add candidate failed:", error);
      }
    }
  }

  function handleFileChange(event, setFile) {
    setFile(event.target.files[0]);
  }
  
  return (
    <div className="container mt-4">
      <div className="card mb-4">
        <div className="card-header">
          <h5>Candidates List</h5>
        </div>
        <div className="card-body">
          <table className="table table-bordered">
            <thead>
              <tr>
                <th>Num</th>
                <th>Image</th>
                <th>Name</th>
                <th>Manifesto</th>
                <th>Vote count</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {candidates.map((candidate, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>
                    <img
                      src={`https://amaranth-rational-bovid-697.mypinata.cloud/ipfs/${candidate.imageIpfsHash}`}
                      alt="Candidate"
                      width="100"
                    />
                  </td>
                  <td>{candidate.name}</td>
                  <td>
                    <a
                      href={`https://amaranth-rational-bovid-697.mypinata.cloud/ipfs/${candidate.manifestoIpfsHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Read manifesto
                    </a>
                  </td>
                  <td>{candidate.voteCount}</td>
                  <td>
                    <button className="btn btn-outline-dark" onClick={() => vote(index)}>Vote</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header">
          <h5>{account ? "Connected Account" : "Not Connected"}</h5>
        </div>
        <div className="card-body">
          <p>{account}</p>
        </div>
      </div>

      {account && (
        <div className="card mb-4">
          <div className="card-header">
            <h5>Number of candidates</h5>
          </div>
          <div className="card-body">
            <p>{numberCandidates}</p>
          </div>
        </div>
      )}
    

    <div className="card mb-4">
      <div className="card-header">
        <h5>Candidate Information</h5>
      </div>
      <div className="card-body">
        <div className="form-group">
          <label>Candidate Name</label>
          <input
            type="text"
            className="form-control"
            placeholder="Candidate Name"
            value={candidateName}
            onChange={(e) => setCandidateName(e.target.value)}
          />
        </div>

        <div className="form-group mt-3">
          <label>Image</label>
          <input
            type="file"
            className="form-control"
            onChange={(e) => handleFileChange(e, setImageFile)}
          />
        </div>

        <div className="form-group mt-3">
          <label>Manifesto</label>
          <input
            type="file"
            className="form-control"
            onChange={(e) => handleFileChange(e, setManifestoFile)}
          />
        </div>

        <button className="btn btn-dark mt-4" onClick={addCandidate}>
          Add Candidate
        </button>
      </div>
    </div>

    </div>
  );
}

export default VotingPage;
