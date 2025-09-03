// Variables globales
const connectBtn = document.getElementById("connectBtn");
const sendBtn = document.getElementById("sendBtn");
const copyBtn = document.getElementById("copyBtn");
const walletAddress = document.getElementById("walletAddress");

let currentAccount = null;

// Conectar MetaMask y obtener balance
connectBtn.addEventListener("click", async () => {
  if (typeof window.ethereum !== "undefined") {
    try {
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      currentAccount = accounts[0];
      walletAddress.value = currentAccount;
      alert("✅ Conectado a MetaMask");

      // Obtener balance
      await updateBalance();

    } catch (error) {
      console.error(error);
      alert("❌ Error al conectar MetaMask");
    }
  } else {
    alert("⚠️ Instala MetaMask");
  }
});

// Función para actualizar balance
async function updateBalance() {
  if (!currentAccount) return;
  
  try {
    const balanceWei = await ethereum.request({
      method: "eth_getBalance",
      params: [currentAccount, "latest"]
    });

    // Convertir de wei a ETH
    const balanceEth = parseFloat(parseInt(balanceWei, 16) / 1e18).toFixed(4);

    // Mostrar en el frontend
    document.getElementById("balance").innerText = `${balanceEth} ETH`;
  } catch (error) {
    console.error("Error al obtener balance:", error);
  }
}

// Enviar ETH
sendBtn.addEventListener("click", async () => {
  const recipient = document.getElementById("recipient").value;
  const amountEth = document.getElementById("amount").value;

  if (!currentAccount) {
    alert("⚠️ Primero conecta tu wallet");
    return;
  }

  if (!recipient || !amountEth) {
    alert("⚠️ Completa todos los campos");
    return;
  }

  try {
    // Convertir ETH a wei
    const amountWei = "0x" + (parseFloat(amountEth) * 1e18).toString(16);

    const transactionParameters = {
      to: recipient,
      from: currentAccount,
      value: amountWei,
    };

    const txHash = await ethereum.request({
      method: "eth_sendTransaction",
      params: [transactionParameters],
    });

    alert(`✅ Transacción enviada! Hash: ${txHash}`);
    
    // Actualizar balance después de la transacción
    setTimeout(updateBalance, 2000);

  } catch (error) {
    console.error(error);
    alert("❌ Error al enviar transacción");
  }
});

// Copiar dirección al portapapeles
copyBtn.addEventListener("click", async () => {
  if (walletAddress.value) {
    try {
      await navigator.clipboard.writeText(walletAddress.value);
      alert("📋 Dirección copiada al portapapeles");
    } catch (error) {
      // Fallback para navegadores que no soportan clipboard API
      walletAddress.select();
      document.execCommand('copy');
      alert("📋 Dirección copiada al portapapeles");
    }
  } else {
    alert("⚠️ No hay dirección para copiar");
  }
});
