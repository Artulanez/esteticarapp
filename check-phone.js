const digits = (value) => value.toString().trim().replace(/\D/g, '');
const isValidPhone = (value) => /^\d{10,11}$/.test(digits(value));

const samples = ['81981546565', '(81) 98154-6565', '81999-9999', '9999'];
for (const sample of samples) {
  console.log(`${sample} => ${isValidPhone(sample)}`);
}
