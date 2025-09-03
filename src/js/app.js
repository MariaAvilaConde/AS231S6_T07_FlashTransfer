// Simulación de conexión con MetaMask
const connectBtn = document.getElementById("connectBtn");
const sendBtn = document.getElementById("sendBtn");
const copyBtn = document.getElementById("copyBtn");
const walletAddress = document.getElementById("walletAddress");

// Conectar MetaMask y obtener balance
connectBtn.addEventListener("click", async () => {
  if (typeof window.ethereum !== "undefined") {
    try {
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      walletAddress.value = accounts[0];
      alert("✅ Conectado a MetaMask");

      // Obtener balance
      const balanceWei = await ethereum.request({
        method: "eth_getBalance",
        params: [accounts[0], "latest"]
      });

      // Convertir de wei a ETH
      const balanceEth = parseFloat(parseInt(balanceWei, 16) / 1e18).toFixed(4);

      // Mostrar en el frontend
      document.getElementById("balance").innerText = `${balanceEth} ETH`;

    } catch (error) {
      console.error(error);
      alert("❌ Error al conectar MetaMask");
    }
  } else {
    alert("⚠️ Instala MetaMask");
  }
  // Enviar ETH
sendBtn.addEventListener("click", async () => {
  const recipient = document.getElementById("recipient").value;
  const amountEth = document.getElementById("amount").value;
})}
);
