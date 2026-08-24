export function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const m = today.getMonth() - dateOfBirth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }
  return age;
}

export function determineInvestorType(age: number): string {
  if (age < 18) {
    return 'MINOR';
  }
  // This can be expanded based on other criteria
  return 'ADULT';
}
