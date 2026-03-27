import icon1 from '../assets/Icons/Icon-1.png';
import icon2 from '../assets/Icons/Icon-2.png';
import icon3 from '../assets/Icons/Icon-3.png';
import icon4 from '../assets/Icons/Icon-4.png';
import icon5 from '../assets/Icons/Icon-5.png';
import icon6 from '../assets/Icons/Icon-6.png';
import icon7 from '../assets/Icons/Icon-7.png';
import icon8 from '../assets/Icons/Icon-8.png';
import icon9 from '../assets/Icons/Icon-9.png';
import icon10 from '../assets/Icons/Icon-10.png';
import icon11 from '../assets/Icons/Icon-11.png';

export const BLUBO_ICONS = [
  icon1, icon2, icon3, icon4, icon5, icon6,
  icon7, icon8, icon9, icon10, icon11,
];

// Returns the icon source for a given index (0-10)
export function getBluboIcon(index) {
  return BLUBO_ICONS[index] || BLUBO_ICONS[0];
}
