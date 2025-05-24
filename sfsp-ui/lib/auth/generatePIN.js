
export function generatePIN() {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
  let resetPIN = "";
  for (let i = 0; i < 5; i++) {
    resetPIN += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return resetPIN;

}


