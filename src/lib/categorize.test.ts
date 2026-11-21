import { describe, expect, it } from "vitest";
import { categorize, type Category } from "./categorize";

const CASES: [string, Category][] = [
  // Produce
  ["Avocados", "Produce"], ["Limes", "Produce"], ["Cilantro", "Produce"], ["2 limes", "Produce"],
  ["Bananas", "Produce"], ["apples", "Produce"], ["a bag of carrots", "Produce"], ["Strawberries", "Produce"],
  ["blueberries", "Produce"], ["Tomatoes", "Produce"], ["cherry tomatoes", "Produce"], ["Potatoes", "Produce"],
  ["sweet potatoes", "Produce"], ["Onions", "Produce"], ["green onions", "Produce"], ["Garlic", "Produce"],
  ["Spinach", "Produce"], ["romaine lettuce", "Produce"], ["Broccoli", "Produce"], ["Bell peppers", "Produce"],
  ["jalapeños", "Produce"], ["Cucumbers", "Produce"], ["Zucchini", "Produce"], ["Mushrooms", "Produce"],
  ["Lemons", "Produce"], ["Grapes", "Produce"], ["oranges", "Produce"], ["Peaches", "Produce"],
  ["Celery", "Produce"], ["Scallions", "Produce"], ["Kale", "Produce"], ["Corn", "Produce"],
  ["3 avocados", "Produce"], ["a dozen limes", "Produce"], ["Fresh basil", "Produce"], ["Olives", "Produce"],
  // Meat & Seafood
  ["Chicken breasts", "Meat & Seafood"], ["Ground beef", "Meat & Seafood"], ["Bacon", "Meat & Seafood"],
  ["Salmon", "Meat & Seafood"], ["shrimp", "Meat & Seafood"], ["Pork chops", "Meat & Seafood"],
  ["Sausages", "Meat & Seafood"], ["Turkey", "Meat & Seafood"], ["Steak", "Meat & Seafood"],
  ["2 lbs ground turkey", "Meat & Seafood"], ["Hot dogs", "Meat & Seafood"], ["Deli meat", "Meat & Seafood"],
  // Dairy & Eggs
  ["Milk", "Dairy & Eggs"], ["Eggs", "Dairy & Eggs"], ["a dozen eggs", "Dairy & Eggs"], ["Butter", "Dairy & Eggs"],
  ["Greek yogurt", "Dairy & Eggs"], ["Cheddar cheese", "Dairy & Eggs"], ["Shredded cheese", "Dairy & Eggs"],
  ["Sour cream", "Dairy & Eggs"], ["Cream cheese", "Dairy & Eggs"], ["Heavy cream", "Dairy & Eggs"],
  ["Oat milk", "Dairy & Eggs"], ["Half and half", "Dairy & Eggs"], ["Mozzarella", "Dairy & Eggs"],
  ["Coffee creamer", "Dairy & Eggs"], ["1 gallon of milk", "Dairy & Eggs"], ["Parmesan", "Dairy & Eggs"],
  // Bakery
  ["Bread", "Bakery"], ["Bagels", "Bakery"], ["Tortillas", "Bakery"], ["Hamburger buns", "Bakery"],
  ["Croissants", "Bakery"], ["English muffins", "Bakery"], ["Sourdough", "Bakery"], ["Dinner rolls", "Bakery"],
  ["a loaf of bread", "Bakery"], ["Pita", "Bakery"],
  // Pantry
  ["Taco shells", "Pantry"], ["Coffee beans", "Pantry"], ["Olive oil", "Pantry"], ["Rice", "Pantry"],
  ["Pasta", "Pantry"], ["Spaghetti", "Pantry"], ["Peanut butter", "Pantry"], ["Flour", "Pantry"],
  ["Sugar", "Pantry"], ["Cereal", "Pantry"], ["Oatmeal", "Pantry"], ["Black beans", "Pantry"],
  ["Chicken broth", "Pantry"], ["Ketchup", "Pantry"], ["Mayo", "Pantry"], ["Salsa", "Pantry"],
  ["Honey", "Pantry"], ["Taco seasoning", "Pantry"], ["Canned tomatoes", "Pantry"], ["Soy sauce", "Pantry"],
  ["Maple syrup", "Pantry"], ["Tea", "Pantry"], ["Coffee", "Pantry"], ["Ranch dressing", "Pantry"],
  ["Chocolate chips", "Pantry"], ["Vinegar", "Pantry"],
  // Frozen
  ["Ice cream", "Frozen"], ["Frozen pizza", "Frozen"], ["Frozen peas", "Frozen"], ["Waffles", "Frozen"],
  ["Tater tots", "Frozen"], ["French fries", "Frozen"], ["Ice", "Frozen"], ["Popsicles", "Frozen"],
  // Snacks
  ["Chips", "Snacks"], ["Tortilla chips", "Snacks"], ["Crackers", "Snacks"], ["Goldfish", "Snacks"],
  ["Cookies", "Snacks"], ["Pretzels", "Snacks"], ["Popcorn", "Snacks"], ["Almonds", "Snacks"],
  ["Granola bars", "Snacks"], ["Dark chocolate", "Snacks"],
  // Beverages
  ["Orange juice", "Beverages"], ["Sparkling water", "Beverages"], ["La Croix", "Beverages"],
  ["Beer", "Beverages"], ["Wine", "Beverages"], ["Soda", "Beverages"], ["Apple juice", "Beverages"],
  ["Lemonade", "Beverages"], ["Gatorade", "Beverages"],
  // Household
  ["Paper towels", "Household"], ["Toilet paper", "Household"], ["Dish soap", "Household"],
  ["Laundry detergent", "Household"], ["Trash bags", "Household"], ["Aluminum foil", "Household"],
  ["Sponges", "Household"], ["Toothpaste", "Household"], ["Shampoo", "Household"], ["Batteries", "Household"],
  ["Dishwasher pods", "Household"], ["Napkins", "Household"], ["Ziploc bags", "Household"],
  ["Dog food", "Household"], ["Light bulbs", "Household"], ["Tissues", "Household"],
  // Other
  ["Birthday candles", "Other"], ["Gift card", "Other"], ["Flowers for mom", "Other"], ["Stamps", "Other"],
];

describe("categorize", () => {
  it("has at least 100 cases", () => {
    expect(CASES.length).toBeGreaterThanOrEqual(100);
  });
  it.each(CASES)("%s → %s", (name, expected) => {
    expect(categorize(name)).toBe(expected);
  });
});
