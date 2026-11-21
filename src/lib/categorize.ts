/**
 * Client-side grocery categories. HA's Shopping List stores only a name, so every screen
 * computes the category the same way from the name. Plain keyword map, no AI.
 */
export const CATEGORIES = [
  "Produce",
  "Meat & Seafood",
  "Dairy & Eggs",
  "Bakery",
  "Pantry",
  "Frozen",
  "Snacks",
  "Beverages",
  "Household",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

// Multi-word keywords are checked before single words, so "peanut butter" beats "butter"
// and "ice cream" beats "cream". Keywords are singular; plurals are folded before matching.
const KEYWORDS: Record<Exclude<Category, "Other">, string[]> = {
  Produce: [
    "apple", "avocado", "banana", "basil", "bean sprout", "bell pepper", "berry", "blackberry",
    "blueberry", "broccoli", "brussels sprout", "cabbage", "cantaloupe", "carrot", "cauliflower",
    "celery", "cherry", "cilantro", "clementine", "corn on the cob", "cucumber", "dill", "eggplant",
    "fruit", "garlic", "ginger", "grape", "grapefruit", "green bean", "green onion", "herb",
    "jalapeno", "jalapeño", "kale", "kiwi", "leek", "lemon", "lettuce", "lime", "mango", "melon",
    "mint", "mushroom", "nectarine", "onion", "orange", "parsley", "peach", "pear", "pepper",
    "pineapple", "plum", "pomegranate", "potato", "pumpkin", "radish", "raspberry", "romaine",
    "rosemary", "salad", "scallion", "shallot", "spinach", "squash", "strawberry", "sweet potato",
    "thyme", "tomato", "vegetable", "veggie", "watermelon", "zucchini", "arugula", "asparagus", "beet",
    "corn", "olive", "chive", "cranberry", "fig", "date", "sprout",
  ],
  "Meat & Seafood": [
    "bacon", "beef", "brisket", "chicken", "chorizo", "cod", "crab", "fish", "ground beef",
    "ground turkey", "ham", "hot dog", "lamb", "lobster", "meat", "meatball", "pork", "prosciutto",
    "rib", "salami", "salmon", "sausage", "scallop", "shrimp", "steak", "tilapia", "tuna steak",
    "turkey", "pepperoni", "deli meat", "pork chop", "chicken breast", "chicken thigh",
  ],
  "Dairy & Eggs": [
    "butter", "buttermilk", "cheddar", "cheese", "cottage cheese", "cream", "cream cheese",
    "egg", "feta", "greek yogurt", "half and half", "heavy cream", "milk", "mozzarella",
    "parmesan", "sour cream", "string cheese", "yogurt", "oat milk", "almond milk", "creamer",
    "whipped cream", "ricotta", "goat cheese", "swiss cheese",
  ],
  Bakery: [
    "bagel", "baguette", "bread", "bun", "cake", "croissant", "donut", "doughnut", "english muffin",
    "hamburger bun", "hot dog bun", "muffin", "pita", "roll", "sourdough", "tortilla", "naan",
    "brioche", "pie",
  ],
  Pantry: [
    "baking powder", "baking soda", "bean", "black bean", "broth", "brown sugar", "canned",
    "cereal", "chickpea", "cinnamon", "coconut milk", "coffee", "coffee bean", "flour", "honey",
    "jam", "jelly", "ketchup", "lentil", "maple syrup", "mayo", "mayonnaise", "mustard", "noodle",
    "oat", "oatmeal", "oil", "olive oil", "pasta", "pasta sauce", "peanut butter", "rice",
    "salsa", "salt", "sauce", "soup", "soy sauce", "spaghetti", "spice", "stock", "sugar",
    "syrup", "taco seasoning", "taco shell", "tea", "tomato sauce", "tuna", "vanilla",
    "vinegar", "black pepper", "hot sauce", "ranch", "dressing", "quinoa", "breadcrumb",
    "canned tomato", "diced tomato", "tomato paste", "nutella", "granola",
    "chicken broth", "chicken stock", "beef broth", "vegetable broth", "olive oil", "pickle",
    "hummus", "pancake mix", "brownie mix", "cake mix", "chocolate chip",
  ],
  Frozen: [
    "frozen", "ice cream", "ice", "popsicle", "frozen pizza", "frozen vegetable", "waffle",
    "tater tot", "french fry", "fries", "frozen fruit", "gelato", "sorbet",
  ],
  Snacks: [
    "candy", "chip", "chocolate", "cookie", "cracker", "goldfish", "granola bar", "gum",
    "nut", "almond", "cashew", "peanut", "popcorn", "pretzel", "trail mix", "snack", "jerky",
    "tortilla chip", "potato chip", "fruit snack", "rice cake", "pistachio",
  ],
  Beverages: [
    "beer", "coke", "drink", "juice", "kombucha", "lemonade", "orange juice", "seltzer", "soda",
    "sparkling water", "sports drink", "water", "wine", "gatorade", "la croix", "coconut water",
    "apple juice", "energy drink", "iced tea", "bottled water",
  ],
  Household: [
    "aluminum foil", "foil", "bag", "battery", "bleach", "cleaner", "dish soap", "dishwasher",
    "detergent", "diaper", "dryer sheet", "garbage bag", "hand soap", "laundry", "light bulb",
    "napkin", "paper plate", "paper towel", "plastic wrap", "shampoo", "conditioner", "soap",
    "sponge", "tissue", "toilet paper", "toothpaste", "toothbrush", "trash bag", "wipe",
    "zip bag", "ziploc", "deodorant", "lotion", "razor", "cotton ball", "q-tip", "kleenex",
    "pet food", "dog food", "cat food", "cat litter", "lysol", "windex", "parchment paper",
  ],
};

/** "a dozen", "2", "two", "3 lbs of" … at the start of a name. */
const LEADING_QUANTITY =
  /^(?:\d+(?:[./]\d+)?|a|an|one|two|three|four|five|six|seven|eight|nine|ten|twelve|a couple(?: of)?|a few|a dozen|dozen|some|several)\s+(?:(?:lbs?|pounds?|oz|ounces?|bags?|boxes?|cans?|jars?|bottles?|packs?|packages?|bunch(?:es)?|heads?|cartons?|gallons?|dozen|loaf|loaves|pints?|quarts?)\s+)?(?:of\s+)?/i;

/** Very small English singularizer, enough for grocery names. */
const SINGULAR_EXCEPTIONS: Record<string, string> = {
  cookies: "cookie", brownies: "brownie", pies: "pie", smoothies: "smoothie", veggies: "veggie",
  loaves: "loaf", halves: "half", fries: "fry",
};

export function singular(word: string): string {
  const w = word.toLowerCase();
  if (SINGULAR_EXCEPTIONS[w]) return SINGULAR_EXCEPTIONS[w];
  if (w.length <= 3) return w;
  if (/(ss|us|is)$/.test(w)) return w;
  if (w.endsWith("ies")) return w.slice(0, -3) + "y";          // berries → berry
  if (/(oes|ches|shes|xes|sses)$/.test(w)) return w.slice(0, -2); // tomatoes, peaches, boxes
  if (w.endsWith("s")) return w.slice(0, -1);
  return w;
}

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(LEADING_QUANTITY, "")
    .replace(/[^a-z0-9ñé&' -]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map(singular)
    .join(" ");
}

// Flatten to [keyword, category], longest keyword first.
const TABLE: [string, Category][] = (Object.keys(KEYWORDS) as (keyof typeof KEYWORDS)[])
  .flatMap((cat) => KEYWORDS[cat].map((k) => [k.split(" ").map(singular).join(" "), cat] as [string, Category]))
  .sort((a, b) => b[0].length - a[0].length);

export function categorize(name: string): Category {
  const n = ` ${normalize(name)} `;
  for (const [kw, cat] of TABLE) {
    if (n.includes(` ${kw} `)) return cat;
  }
  return "Other";
}
