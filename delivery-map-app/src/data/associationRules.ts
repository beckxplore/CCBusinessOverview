export interface AssociationRule {
  id: string;
  category: 'core' | 'lift' | 'balanced';
  antecedents: string[];
  consequents: string[];
  support: number; // decimal value, e.g. 0.064 for 6.4%
  confidence: number; // decimal value
  lift: number;
  insight: string;
}

export const associationRules: AssociationRule[] = [
  {
    id: 'core-1',
    category: 'core',
    antecedents: ['Beetroot'],
    consequents: ['Carrot'],
    support: 0.064,
    confidence: 0.362,
    lift: 1.6,
    insight: 'Beetroot buyers are 1.6× more likely to add Carrot.'
  },
  {
    id: 'core-2',
    category: 'core',
    antecedents: ['Beetroot', 'Potato'],
    consequents: ['Carrot'],
    support: 0.054,
    confidence: 0.376,
    lift: 1.67,
    insight: 'Beetroot + Potato baskets lift Carrot by 67%.'
  },
  {
    id: 'core-3',
    category: 'core',
    antecedents: ['Carrot', 'Potato'],
    consequents: ['Beetroot'],
    support: 0.054,
    confidence: 0.321,
    lift: 1.8,
    insight: 'Carrot + Potato customers often add Beetroot (1.8×).' 
  },
  {
    id: 'core-4',
    category: 'core',
    antecedents: ['Beetroot'],
    consequents: ['Carrot', 'Potato'],
    support: 0.054,
    confidence: 0.305,
    lift: 1.8,
    insight: 'Beetroot reliably cross-sells into Carrot + Potato.'
  },
  {
    id: 'core-5',
    category: 'core',
    antecedents: ['Carrot', 'Potato', 'Red Onion A'],
    consequents: ['Tomato'],
    support: 0.042,
    confidence: 0.863,
    lift: 1.56,
    insight: '86% of Carrot + Potato + Red Onion A baskets also include Tomato.'
  },
  {
    id: 'core-6',
    category: 'core',
    antecedents: ['Beetroot', 'Tomato'],
    consequents: ['Carrot'],
    support: 0.04,
    confidence: 0.429,
    lift: 1.9,
    insight: 'Beetroot + Tomato buyers are nearly twice as likely to add Carrot.'
  },
  {
    id: 'core-7',
    category: 'core',
    antecedents: ['Carrot', 'Tomato'],
    consequents: ['Beetroot'],
    support: 0.04,
    confidence: 0.303,
    lift: 1.71,
    insight: 'Carrot + Tomato combinations commonly add Beetroot (1.7×).' 
  },
  {
    id: 'core-8',
    category: 'core',
    antecedents: ['Beetroot', 'Tomato'],
    consequents: ['Red Onion A'],
    support: 0.039,
    confidence: 0.411,
    lift: 1.53,
    insight: 'Beetroot + Tomato baskets lean heavily toward Red Onion A.'
  },
  {
    id: 'core-9',
    category: 'core',
    antecedents: ['Beetroot', 'Potato', 'Tomato'],
    consequents: ['Carrot'],
    support: 0.036,
    confidence: 0.468,
    lift: 2.07,
    insight: 'Tomato joins Beetroot + Potato to pull Carrot with a 2× lift.'
  },
  {
    id: 'core-10',
    category: 'core',
    antecedents: ['Beetroot', 'Tomato'],
    consequents: ['Carrot', 'Potato'],
    support: 0.036,
    confidence: 0.379,
    lift: 2.25,
    insight: 'Beetroot + Tomato baskets are 2.3× more likely to add Carrot + Potato.'
  },
  {
    id: 'core-11',
    category: 'core',
    antecedents: ['Carrot', 'Potato', 'Tomato'],
    consequents: ['Beetroot'],
    support: 0.036,
    confidence: 0.341,
    lift: 1.92,
    insight: 'Carrot + Potato + Tomato drives Beetroot add-ons (1.9×).' 
  },
  {
    id: 'lift-1',
    category: 'lift',
    antecedents: ['Beetroot', 'Potato', 'Red Onion A'],
    consequents: ['Red Onion B', 'Tomato'],
    support: 0.012,
    confidence: 0.311,
    lift: 5.58,
    insight: 'High-end “onion combo”: 5.6× chance of adding Red Onion B + Tomato.'
  },
  {
    id: 'lift-2',
    category: 'lift',
    antecedents: ['Carrot', 'Red Onion B'],
    consequents: ['Beetroot', 'Potato', 'Tomato'],
    support: 0.01,
    confidence: 0.398,
    lift: 5.2,
    insight: 'Red Onion B buyers respond 5.2× to the Beetroot-Potato-Tomato set.'
  },
  {
    id: 'lift-3',
    category: 'lift',
    antecedents: ['Carrot', 'Potato', 'Red Onion B'],
    consequents: ['Beetroot', 'Tomato'],
    support: 0.01,
    confidence: 0.484,
    lift: 5.12,
    insight: 'When Red Onion B joins Carrot + Potato, Beetroot + Tomato follow (5.1×).' 
  },
  {
    id: 'lift-4',
    category: 'lift',
    antecedents: ['Potato', 'Red Onion A', 'Red Onion B'],
    consequents: ['Beetroot', 'Tomato'],
    support: 0.012,
    confidence: 0.461,
    lift: 4.88,
    insight: 'Mixed onion baskets drive Beetroot + Tomato attachment (4.9×).' 
  },
  {
    id: 'lift-5',
    category: 'lift',
    antecedents: ['Red Onion A', 'Red Onion B'],
    consequents: ['Beetroot', 'Potato', 'Tomato'],
    support: 0.012,
    confidence: 0.372,
    lift: 4.86,
    insight: 'Both onion types signal Beetroot + Potato + Tomato demand (4.9×).' 
  },
  {
    id: 'balanced-1',
    category: 'balanced',
    antecedents: ['Carrot', 'Potato', 'Red Onion A'],
    consequents: ['Tomato'],
    support: 0.042,
    confidence: 0.863,
    lift: 1.56,
    insight: 'High-volume trio that almost always adds Tomato.'
  },
  {
    id: 'balanced-2',
    category: 'balanced',
    antecedents: ['Beetroot', 'Carrot', 'Potato', 'Red Onion A'],
    consequents: ['Tomato'],
    support: 0.02,
    confidence: 0.948,
    lift: 1.71,
    insight: '94.8% of four-item baskets include Tomato—excellent for bundle messaging.'
  },
  {
    id: 'balanced-3',
    category: 'balanced',
    antecedents: ['Beetroot', 'Carrot', 'Red Onion A'],
    consequents: ['Tomato'],
    support: 0.021,
    confidence: 0.914,
    lift: 1.65,
    insight: 'Beetroot + Carrot + Red Onion A almost guarantees Tomato add-on.'
  },
  {
    id: 'balanced-4',
    category: 'balanced',
    antecedents: ['Carrot', 'Potato', 'Red Onion B'],
    consequents: ['Beetroot', 'Tomato'],
    support: 0.01,
    confidence: 0.484,
    lift: 5.12,
    insight: 'Balanced rule with strong lift and moderate frequency for premium bundles.'
  },
  {
    id: 'balanced-5',
    category: 'balanced',
    antecedents: ['Carrot', 'Red Onion A'],
    consequents: ['Potato', 'Tomato'],
    support: 0.042,
    confidence: 0.671,
    lift: 1.57,
    insight: 'Carrot + Red Onion A often lead to Potato + Tomato baskets.'
  }
];
