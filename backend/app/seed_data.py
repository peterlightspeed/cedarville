"""Starter question bank and videos.

Hand-written questions live in the tables below; counting and arithmetic
questions are generated with a fixed random seed so the bank is identical on
every fresh database. Teachers can add or edit questions through the admin API.
"""
from __future__ import annotations

import random

# (level, subject, visual, prompt, answer, [wrong options], explanation)
H = [
    # ---------------- tiny (2-3) ----------------
    ("tiny", "colours", "🍌", "What colour is a banana?", "Yellow", ["Blue", "Red"], "Bananas are yellow. 💛"),
    ("tiny", "colours", "🍎", "What colour is this apple?", "Red", ["Green", "Purple"], "This apple is red. ❤️"),
    ("tiny", "colours", "☁️", "What colour is the sky on a sunny day?", "Blue", ["Pink", "Black"], "The sky is blue. 💙"),
    ("tiny", "colours", "🌿", "What colour is grass?", "Green", ["Orange", "Red"], "Grass is green. 💚"),
    ("tiny", "colours", "🍊", "What colour is an orange?", "Orange", ["Blue", "Purple"], "Oranges are orange!"),
    ("tiny", "animals", "🐄", "Which animal says MOO?", "Cow", ["Dog", "Cat"], "The cow says moo!"),
    ("tiny", "animals", "🐶", "Which animal says WOOF?", "Dog", ["Duck", "Cow"], "The dog says woof woof!"),
    ("tiny", "animals", "🐱", "Which animal says MEOW?", "Cat", ["Dog", "Lion"], "The cat says meow!"),
    ("tiny", "animals", "🦆", "Which animal says QUACK?", "Duck", ["Pig", "Cat"], "The duck says quack quack!"),
    ("tiny", "animals", "🐑", "Which animal says BAA?", "Sheep", ["Horse", "Frog"], "The sheep says baa!"),
    ("tiny", "animals", "🐘", "Which animal is very, very big?", "Elephant", ["Mouse", "Ant"], "Elephants are the biggest land animals!"),
    ("tiny", "shapes", "⚪", "What shape is a ball?", "Circle", ["Square", "Triangle"], "A ball is round like a circle."),
    ("tiny", "shapes", "🟦", "Which shape has 4 equal sides?", "Square", ["Circle", "Triangle"], "A square has 4 equal sides."),
    ("tiny", "shapes", "🔺", "Which shape has 3 sides?", "Triangle", ["Circle", "Square"], "A triangle has 3 sides."),
    ("tiny", "body", "👀", "What do we use to SEE?", "Eyes", ["Ears", "Feet"], "We see with our eyes!"),
    ("tiny", "body", "👂", "What do we use to HEAR?", "Ears", ["Eyes", "Nose"], "We hear with our ears!"),
    ("tiny", "body", "👃", "What do we use to SMELL?", "Nose", ["Hands", "Knees"], "We smell with our nose!"),
    ("tiny", "body", "👏", "What do we use to CLAP?", "Hands", ["Feet", "Eyes"], "We clap with our hands!"),
    ("tiny", "nature", "☀️", "When is the sun out?", "Daytime", ["Night-time", "Never"], "The sun shines in the daytime."),
    ("tiny", "nature", "🌙", "When can we see the moon?", "Night-time", ["Lunch-time", "Never"], "The moon comes out at night."),
    ("tiny", "english", "🛏️", "What do we do in bed at night?", "Sleep", ["Run", "Swim"], "We sleep at night. Sweet dreams! 😴"),
    ("tiny", "english", "🍽️", "What do we do when we are hungry?", "Eat", ["Sleep", "Jump"], "We eat when we are hungry!"),
    # ---------------- nursery (4-5) ----------------
    ("nursery", "colours", "🌈", "Which colour do you get when you mix blue and yellow?", "Green", ["Red", "Pink"], "Blue + yellow makes green!"),
    ("nursery", "colours", "🇳🇬", "The Nigerian flag is green and ...?", "White", ["Black", "Pink"], "Green, white, green! 🇳🇬"),
    ("nursery", "shapes", "📐", "How many sides does a triangle have?", "3", ["4", "5"], "A triangle has 3 sides."),
    ("nursery", "shapes", "⬜", "How many corners does a square have?", "4", ["3", "2"], "A square has 4 corners."),
    ("nursery", "shapes", "🚪", "A door is shaped like a ...", "Rectangle", ["Circle", "Triangle"], "A door is a rectangle."),
    ("nursery", "animals", "🐟", "Where does a fish live?", "Water", ["Tree", "Sky"], "Fish live in the water."),
    ("nursery", "animals", "🐦", "Which animal can fly?", "Bird", ["Fish", "Cow"], "Birds have wings to fly!"),
    ("nursery", "animals", "🐝", "What does a bee make?", "Honey", ["Milk", "Bread"], "Busy bees make honey. 🍯"),
    ("nursery", "animals", "🐔", "What does a hen lay?", "Eggs", ["Apples", "Milk"], "Hens lay eggs. 🥚"),
    ("nursery", "animals", "🐄", "Which animal gives us milk?", "Cow", ["Fish", "Duck"], "Cows give us milk."),
    ("nursery", "nature", "🌧️", "What falls from the clouds when it rains?", "Water", ["Sand", "Leaves"], "Rain is water falling from clouds."),
    ("nursery", "nature", "🌱", "What do plants need to grow?", "Water and sun", ["Toys", "Sweets"], "Plants need water and sunshine."),
    ("nursery", "nature", "🌳", "Which part of a tree is brown and strong?", "Trunk", ["Leaves", "Flower"], "The trunk holds the tree up."),
    ("nursery", "body", "🦷", "What do we use to chew food?", "Teeth", ["Hair", "Toes"], "Teeth help us chew. Brush them every day! 🪥"),
    ("nursery", "body", "🖐️", "How many fingers on one hand?", "5", ["4", "6"], "One hand has 5 fingers."),
    ("nursery", "english", "🔥", "The opposite of HOT is ...", "Cold", ["Big", "Fast"], "Hot and cold are opposites."),
    ("nursery", "english", "🐘", "The opposite of BIG is ...", "Small", ["Tall", "Loud"], "Big and small are opposites."),
    ("nursery", "english", "⬆️", "The opposite of UP is ...", "Down", ["Over", "In"], "Up and down are opposites."),
    ("nursery", "english", "😊", "The opposite of HAPPY is ...", "Sad", ["Hot", "Tall"], "Happy and sad are opposites."),
    ("nursery", "english", "🙏", "What magic word do we say when we ask for something?", "Please", ["Give", "Now"], "We say 'please' to be polite."),
    ("nursery", "english", "🎁", "What do we say when someone gives us a gift?", "Thank you", ["Go away", "Mine"], "We say 'thank you'."),
    ("nursery", "nigeria", "🍚", "Which food is popular in Nigeria?", "Jollof rice", ["Sushi", "Pizza"], "Jollof rice is loved all over Nigeria!"),
    ("nursery", "nigeria", "🥭", "Which of these is a fruit?", "Mango", ["Rice", "Bread"], "A mango is a sweet fruit."),
    ("nursery", "letters", "🔤", "Which is the FIRST letter of the alphabet?", "A", ["M", "Z"], "A is the first letter."),
    ("nursery", "numbers", "🗓️", "How many days are in a week?", "7", ["5", "10"], "There are 7 days in a week."),
    # ---------------- lower (6-8) ----------------
    ("lower", "english", "✍️", "Which word is spelt correctly?", "Friend", ["Freind", "Frend"], "The correct spelling is F-R-I-E-N-D."),
    ("lower", "english", "✍️", "Which word is spelt correctly?", "Because", ["Becos", "Becuse"], "The correct spelling is B-E-C-A-U-S-E."),
    ("lower", "english", "🐕", "Which word is a NOUN (a naming word)?", "Dog", ["Run", "Quickly"], "A noun names a person, animal, place or thing."),
    ("lower", "english", "🏃", "Which word is a VERB (an action word)?", "Jump", ["Table", "Blue"], "A verb tells us what someone does."),
    ("lower", "english", "🐱", "The plural of 'cat' is ...", "Cats", ["Cates", "Catten"], "Add 's' to make most words plural."),
    ("lower", "english", "📖", "Which sentence is correct?", "I am happy.", ["i am happy", "I is happy."], "Start with a capital letter and use 'am' with 'I'."),
    ("lower", "english", "😄", "A word that means the same as 'big' is ...", "Large", ["Tiny", "Slow"], "Big and large mean the same."),
    ("lower", "science", "🌍", "What do we call the star that gives us light and heat?", "The Sun", ["The Moon", "Mars"], "The Sun is a star. It gives us light and heat. ☀️"),
    ("lower", "science", "💧", "Water that is frozen is called ...", "Ice", ["Steam", "Smoke"], "Frozen water is ice. 🧊"),
    ("lower", "science", "🌱", "What do plants take in through their roots?", "Water", ["Toys", "Sand only"], "Roots drink water from the soil."),
    ("lower", "science", "🦴", "What gives our body its shape and helps us stand?", "Bones", ["Hair", "Nails"], "Our skeleton is made of bones."),
    ("lower", "science", "🌡️", "What do we use to measure temperature?", "Thermometer", ["Ruler", "Clock"], "A thermometer tells us how hot or cold it is."),
    ("lower", "science", "🐛", "A caterpillar grows into a ...", "Butterfly", ["Bird", "Fish"], "Caterpillars become butterflies. 🦋"),
    ("lower", "nigeria", "🇳🇬", "What is the capital city of Nigeria?", "Abuja", ["Lagos", "Kano"], "Abuja is Nigeria's capital. Lagos is its biggest city."),
    ("lower", "nigeria", "🇳🇬", "What are the colours of the Nigerian flag?", "Green and white", ["Red and blue", "Yellow and black"], "Green, white, green. 🇳🇬"),
    ("lower", "nigeria", "💵", "What is the money we use in Nigeria called?", "Naira", ["Dollar", "Pound"], "Nigeria's money is the naira (₦)."),
    ("lower", "nigeria", "🗓️", "Nigeria celebrates Independence Day in which month?", "October", ["January", "June"], "Independence Day is 1st October."),
    ("lower", "maths", "🕐", "How many minutes are in one hour?", "60", ["100", "30"], "1 hour = 60 minutes."),
    ("lower", "maths", "🗓️", "How many months are in a year?", "12", ["10", "7"], "A year has 12 months."),
    ("lower", "maths", "🔷", "How many sides does a hexagon have?", "6", ["5", "8"], "Hex means six."),
    ("lower", "maths", "🧮", "What comes next? 2, 4, 6, 8, ...", "10", ["9", "12"], "We count in 2s: 10 comes next."),
    ("lower", "maths", "🧮", "What comes next? 5, 10, 15, 20, ...", "25", ["30", "21"], "We count in 5s: 25 comes next."),
    ("lower", "maths", "💵", "₦50 + ₦50 = ?", "₦100", ["₦60", "₦500"], "50 + 50 = 100."),
    ("lower", "nature", "🌍", "How many days are in a normal week?", "7", ["5", "6"], "Monday to Sunday is 7 days."),
    # ---------------- upper (9-11) ----------------
    ("upper", "science", "🌱", "What process do plants use to make food from sunlight?", "Photosynthesis", ["Evaporation", "Digestion"], "Plants use sunlight, water and carbon dioxide to make food."),
    ("upper", "science", "🌍", "Which planet do we live on?", "Earth", ["Mars", "Venus"], "We live on planet Earth. 🌍"),
    ("upper", "science", "🪐", "Which is the biggest planet in our solar system?", "Jupiter", ["Earth", "Mercury"], "Jupiter is the largest planet."),
    ("upper", "science", "💨", "What gas do humans need to breathe in to stay alive?", "Oxygen", ["Helium", "Smoke"], "We breathe in oxygen."),
    ("upper", "science", "💧", "When water turns into water vapour, it is called ...", "Evaporation", ["Freezing", "Melting"], "Evaporation: liquid water turns into vapour."),
    ("upper", "science", "🧲", "Which material is attracted to a magnet?", "Iron", ["Wood", "Plastic"], "Magnets attract iron and steel."),
    ("upper", "science", "❤️", "Which organ pumps blood around the body?", "Heart", ["Lungs", "Stomach"], "The heart pumps blood. ❤️"),
    ("upper", "english", "📖", "The past tense of 'run' is ...", "Ran", ["Runned", "Running"], "Run → ran. It is an irregular verb."),
    ("upper", "english", "📖", "The past tense of 'go' is ...", "Went", ["Goed", "Gone"], "Go → went."),
    ("upper", "english", "📖", "Which word is an ADJECTIVE (describing word)?", "Beautiful", ["Quickly", "Teacher"], "Adjectives describe nouns, like 'beautiful flower'."),
    ("upper", "english", "📖", "The opposite of 'ancient' is ...", "Modern", ["Old", "Dusty"], "Ancient means very old; modern means new."),
    ("upper", "english", "📖", "The plural of 'child' is ...", "Children", ["Childs", "Childes"], "Child → children is an irregular plural."),
    ("upper", "english", "📖", "Which is a synonym (same meaning) of 'happy'?", "Joyful", ["Angry", "Tired"], "Happy and joyful mean the same."),
    ("upper", "nigeria", "🇳🇬", "Which is the longest river that runs through Nigeria?", "River Niger", ["River Nile", "River Thames"], "The River Niger flows through Nigeria."),
    ("upper", "nigeria", "🇳🇬", "How many states does Nigeria have?", "36", ["24", "50"], "Nigeria has 36 states plus the Federal Capital Territory."),
    ("upper", "nigeria", "🗺️", "On which continent is Nigeria?", "Africa", ["Asia", "Europe"], "Nigeria is in West Africa."),
    ("upper", "maths", "🍕", "What is 1/2 of 20?", "10", ["5", "40"], "Half of 20 is 10."),
    ("upper", "maths", "🍕", "Which fraction is the biggest?", "3/4", ["1/4", "1/2"], "3/4 is bigger than 1/2 and 1/4."),
    ("upper", "maths", "🔢", "In the number 345, what does the digit 4 stand for?", "40", ["4", "400"], "The 4 is in the tens place, so it means 40."),
    ("upper", "maths", "📏", "How many centimetres are in 1 metre?", "100", ["10", "1000"], "1 m = 100 cm."),
    ("upper", "maths", "⏱️", "How many seconds are in one minute?", "60", ["100", "30"], "1 minute = 60 seconds."),
    ("upper", "maths", "🔺", "How many degrees are in a right angle?", "90", ["180", "45"], "A right angle is 90°."),
    ("upper", "world", "🌍", "Which is the largest continent?", "Asia", ["Africa", "Europe"], "Asia is the largest continent."),
    ("upper", "world", "🌊", "Which is the largest ocean?", "Pacific Ocean", ["Atlantic Ocean", "Indian Ocean"], "The Pacific Ocean is the biggest."),
]

# (emoji, word) for first-letter questions
LETTER_WORDS = [
    ("🍎", "Apple", "A"), ("🏀", "Ball", "B"), ("🐱", "Cat", "C"), ("🐶", "Dog", "D"), ("🥚", "Egg", "E"),
    ("🐟", "Fish", "F"), ("🍇", "Grapes", "G"), ("🏠", "House", "H"), ("🍦", "Ice cream", "I"), ("🧃", "Juice", "J"),
    ("🪁", "Kite", "K"), ("🦁", "Lion", "L"), ("🐒", "Monkey", "M"), ("👃", "Nose", "N"), ("🍊", "Orange", "O"),
    ("🐷", "Pig", "P"), ("👑", "Queen", "Q"), ("🌈", "Rainbow", "R"), ("☀️", "Sun", "S"), ("🐢", "Turtle", "T"),
    ("☂️", "Umbrella", "U"), ("🎻", "Violin", "V"), ("🍉", "Watermelon", "W"), ("🦊", "Fox", "F"), ("🦓", "Zebra", "Z"),
    ("🐘", "Elephant", "E"), ("🍌", "Banana", "B"), ("🥕", "Carrot", "C"), ("🦆", "Duck", "D"), ("🌙", "Moon", "M"),
]
COUNT_EMOJI = ["🍎", "⭐", "🐟", "🎈", "🐥", "🌸", "🚗", "🍌", "🐞", "🧁"]


def _options(rng: random.Random, answer: int, lo: int, hi: int) -> list[str]:
    pool = {answer}
    spread = [answer + d for d in (-2, -1, 1, 2, 3) if lo <= answer + d <= hi and answer + d != answer]
    rng.shuffle(spread)
    for v in spread:
        if len(pool) >= 3:
            break
        pool.add(v)
    while len(pool) < 3:
        pool.add(rng.randint(lo, hi))
    wrong = [str(v) for v in pool if v != answer]
    return wrong[:2]


def generated() -> list[tuple]:
    rng = random.Random(2026)
    out: list[tuple] = []

    # counting: tiny 1-3, nursery 1-10
    for level, lo, hi, reps in (("tiny", 1, 3, 2), ("nursery", 1, 10, 1)):
        for n in range(lo, hi + 1):
            for r in range(reps):
                e = COUNT_EMOJI[(n + r * 3) % len(COUNT_EMOJI)]
                out.append((level, "numbers", e * n, "How many can you count?", str(n),
                            _options(rng, n, 1, max(hi, 4)), f"There are {n}! Great counting!"))

    # first letters (nursery) — sound it out
    for emoji, word, letter in LETTER_WORDS:
        letters = [c for c in "ABCDEFGHIJKLMNOPQRSTUVWXYZ" if c != letter]
        rng.shuffle(letters)
        out.append(("nursery", "letters", emoji, f"{word} starts with which letter?", letter,
                    letters[:2], f"{word} starts with {letter}. {letter} is for {word}!"))

    # addition with pictures (nursery, sums to 5)
    for a in range(1, 4):
        for b in range(1, 4):
            if a + b <= 5:
                e = COUNT_EMOJI[(a * 2 + b) % len(COUNT_EMOJI)]
                out.append(("nursery", "maths", f"{e * a} + {e * b}", f"{a} + {b} = ?", str(a + b),
                            _options(rng, a + b, 1, 6), f"{a} + {b} = {a + b}"))

    # lower: addition and subtraction to 20
    for _ in range(14):
        a, b = rng.randint(3, 12), rng.randint(2, 9)
        out.append(("lower", "maths", "➕", f"{a} + {b} = ?", str(a + b), _options(rng, a + b, 2, 25), f"{a} + {b} = {a + b}"))
    for _ in range(10):
        a = rng.randint(8, 20)
        b = rng.randint(2, a - 1)
        out.append(("lower", "maths", "➖", f"{a} - {b} = ?", str(a - b), _options(rng, a - b, 0, 25), f"{a} - {b} = {a - b}"))
    # lower: simple times tables (2, 5, 10)
    for t in (2, 5, 10):
        for k in (3, 4, 6, 7):
            out.append(("lower", "maths", "✖️", f"{t} × {k} = ?", str(t * k), _options(rng, t * k, 2, 100), f"{t} × {k} = {t * k}"))

    # upper: times tables, division, bigger addition
    for _ in range(14):
        a, b = rng.randint(3, 12), rng.randint(3, 12)
        out.append(("upper", "maths", "✖️", f"{a} × {b} = ?", str(a * b), _options(rng, a * b, 6, 150), f"{a} × {b} = {a * b}"))
    for _ in range(8):
        b, q = rng.randint(2, 9), rng.randint(2, 12)
        out.append(("upper", "maths", "➗", f"{b * q} ÷ {b} = ?", str(q), _options(rng, q, 1, 15), f"{b * q} ÷ {b} = {q}"))
    for _ in range(8):
        a, b = rng.randint(120, 480), rng.randint(110, 390)
        out.append(("upper", "maths", "➕", f"{a} + {b} = ?", str(a + b),
                    [str(a + b + 10), str(a + b - 10)], f"{a} + {b} = {a + b}"))
    return out


def all_questions() -> list[dict]:
    from app.seed_more import MORE, more_generated  # second wave: many more topics

    rows, seen = [], set()
    for level, subject, visual, prompt, answer, wrong, expl in H + generated() + MORE + more_generated():
        if (level, prompt, visual, answer) in seen:
            continue
        seen.add((level, prompt, visual, answer))
        opts = [answer, *wrong]
        random.Random(f"{prompt}{answer}").shuffle(opts)
        rows.append(dict(level=level, subject=subject, visual=visual, prompt=prompt,
                         options=opts, answer=answer, explanation=expl, approved=True))
    return rows


# Only videos whose ID has been checked belong here. Add the rest from the
# in-app Grown-ups > Admin form so you can preview each one first.
VIDEOS = [
    dict(youtube_id="yCjJyiqpAuU", title="ABC Song | Super Simple Songs", category="letters",
         levels=["tiny", "nursery"], emoji="🔤", premium=False),
]
