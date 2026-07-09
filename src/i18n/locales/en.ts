import type { ja } from './ja';

type Resource = { [K in keyof typeof ja]: Record<keyof (typeof ja)[K], string> };

export const en: Resource = {
  app: {
    title: 'Umeda Underground Navi',
    subtitle: 'Navigation for the Umeda underground mall',
    dataVersionNote: 'Shop and exit data as of {{version}}',
  },
  locate: {
    title: 'Find where you are',
    description: 'Pick the entrance you used and shops you can see nearby.',
    entranceLabel: 'Entrance / ticket gate you came from (if known)',
    entranceNone: 'Not selected',
    gpsButton: 'Use approximate location',
    gpsAcquired: 'Location acquired',
    gpsFailed: 'Could not get location (GPS is unreliable underground)',
    shopsLabel: 'Shops you can see nearby (multiple allowed)',
    shopsPlaceholder: 'Search shop name',
    locateButton: 'Estimate my location',
    candidatesTitle: 'Are you around here?',
    candidateConfidence: 'Confidence {{percent}}%',
    noCandidates: 'Could not estimate. Try selecting one or two more shops.',
    confirm: "I'm here",
  },
  destination: {
    title: 'Choose a destination',
    exitsTab: 'Exits & Stations',
    shopsTab: 'Shops',
    searchPlaceholder: 'Search destination',
    startNavigation: 'Start navigation',
  },
  route: {
    title: 'Directions',
    total: 'Total approx. {{distance}}m ({{minutes}} min walk)',
    from: 'From: {{name}}',
    to: 'To: {{name}}',
    stepGo: 'Walk about {{distance}}m',
    actionLeft: 'Turn left at {{name}}',
    actionRight: 'Turn right at {{name}}',
    actionUturn: 'Turn back at {{name}}',
    actionArrive: 'Arrive at {{name}}',
    notFound: 'No route found',
    newSearch: 'Choose another destination',
  },
  lost: {
    button: "I'm lost",
    description: 'Let’s re-check where you are. Pick the shops you can see now.',
  },
  report: {
    title: 'Something wrong?',
    description: 'If a shop or exit differs from reality, please let us know.',
    link: 'Report an error (Google Form)',
  },
  map: {
    title: 'Umeda underground map',
    you: 'You are here',
    destination: 'Destination',
    caption: 'This map is schematic. Distances and positions are approximate.',
  },
  language: {
    label: 'Language',
  },
};
