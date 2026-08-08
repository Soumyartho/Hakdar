export const evaluateEligibility = (profile, schemeRulesJson) => {
  try {
    const rules = typeof schemeRulesJson === 'string' ? JSON.parse(schemeRulesJson) : schemeRulesJson;
    const reasons = [];
    let isEligible = true;

    // Check Age
    if (rules.min_age !== undefined && rules.min_age !== null) {
      if (profile.age === undefined || profile.age === '' || Number(profile.age) < rules.min_age) {
        isEligible = false;
        reasons.push(`Minimum age required is ${rules.min_age} years (Current: ${profile.age || 'Not specified'}).`);
      }
    }
    if (rules.max_age !== undefined && rules.max_age !== null) {
      if (profile.age === undefined || profile.age === '' || Number(profile.age) > rules.max_age) {
        isEligible = false;
        reasons.push(`Maximum age limit is ${rules.max_age} years (Current: ${profile.age || 'Not specified'}).`);
      }
    }

    // Check Gender
    if (rules.gender && rules.gender !== 'any') {
      if (!profile.gender || profile.gender.toLowerCase() !== rules.gender.toLowerCase()) {
        isEligible = false;
        reasons.push(`Scheme is only available for ${rules.gender} applicants.`);
      }
    }

    // Check Income
    if (rules.max_income !== undefined && rules.max_income !== null) {
      if (profile.income === undefined || profile.income === '' || Number(profile.income) > rules.max_income) {
        isEligible = false;
        reasons.push(`Annual household income must be below ₹${rules.max_income.toLocaleString()} (Current: ₹${(Number(profile.income) || 0).toLocaleString()}).`);
      }
    }

    // Check Occupation
    if (rules.occupation && rules.occupation !== 'any') {
      if (!profile.occupation || profile.occupation.toLowerCase() !== rules.occupation.toLowerCase()) {
        isEligible = false;
        reasons.push(`Scheme is only for individuals with occupation: ${rules.occupation}.`);
      }
    }

    // Custom flags
    if (rules.pregnant_or_lactating) {
      if (!profile.pregnant_or_lactating || profile.pregnant_or_lactating === 'false') {
        isEligible = false;
        reasons.push('Must be a pregnant or lactating mother.');
      }
    }

    if (rules.homeless_or_poor_housing) {
      if (!profile.homeless_or_poor_housing || profile.homeless_or_poor_housing === 'false') {
        isEligible = false;
        reasons.push('Must reside in dilapidated housing or be homeless.');
      }
    }

    return {
      isEligible,
      reasons: isEligible ? ['Meets all eligibility criteria.'] : reasons
    };
  } catch (error) {
    console.error('Error in eligibility matching engine:', error);
    return { isEligible: false, reasons: ['Failed to parse eligibility rules.'] };
  }
};
