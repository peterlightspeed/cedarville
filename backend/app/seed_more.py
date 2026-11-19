"""Second wave of questions: many more topics for every age group.

Format: (level, subject, visual, prompt, answer, [wrong options], explanation)
Everything here is simple, well-established fact. Nigeria-specific items stick to widely agreed basics.
"""
from __future__ import annotations

import random

T, N, L, U = "tiny", "nursery", "lower", "upper"

MORE: list[tuple] = [
    # ======================================================= tiny (2-3)
    (T,"colours","🍋","What colour is a lemon?","Yellow",["Blue","Red"],"Lemons are yellow. 💛"),
    (T,"colours","🥕","What colour is a carrot?","Orange",["Purple","Blue"],"Carrots are orange. 🧡"),
    (T,"colours","🍇","What colour are these grapes?","Purple",["Orange","Yellow"],"These grapes are purple. 💜"),
    (T,"colours","☁️","What colour are clouds?","White",["Black","Green"],"Clouds look white."),
    (T,"colours","🍫","What colour is chocolate?","Brown",["Pink","Blue"],"Chocolate is brown. 🤎"),
    (T,"colours","🦩","What colour is a flamingo?","Pink",["Green","Black"],"Flamingos are pink. 💗"),
    (T,"colours","🥛","What colour is milk?","White",["Red","Blue"],"Milk is white."),
    (T,"animals","🦁","Which animal says ROAR?","Lion",["Mouse","Fish"],"The lion says roar!"),
    (T,"animals","🐴","Which animal says NEIGH?","Horse",["Dog","Frog"],"The horse says neigh!"),
    (T,"animals","🐷","Which animal says OINK?","Pig",["Cat","Duck"],"The pig says oink oink!"),
    (T,"animals","🦉","Which bird hoots at night?","Owl",["Duck","Hen"],"The owl says hoo hoo!"),
    (T,"animals","🐒","Which animal loves bananas?","Monkey",["Fish","Cow"],"Monkeys love bananas! 🍌"),
    (T,"animals","🐇","Which animal hops?","Rabbit",["Fish","Snake"],"Rabbits hop, hop, hop!"),
    (T,"animals","🐢","Which animal has a shell and walks slowly?","Turtle",["Lion","Dog"],"Turtles are slow and have a shell."),
    (T,"animals","🦒","Which animal has a very long neck?","Giraffe",["Pig","Cat"],"Giraffes have long necks."),
    (T,"animals","🐍","Which animal has no legs and slithers?","Snake",["Dog","Cow"],"Snakes slither along the ground."),
    (T,"shapes","🍕","A slice of pizza looks like a ...","Triangle",["Circle","Square"],"A pizza slice is a triangle."),
    (T,"shapes","⭐","What shape is this?","Star",["Circle","Square"],"It is a star!"),
    (T,"shapes","❤️","What shape is this?","Heart",["Star","Circle"],"It is a heart."),
    (T,"body","👄","What do we use to talk and eat?","Mouth",["Ears","Knees"],"We talk and eat with our mouth."),
    (T,"body","🦶","What do we use to walk?","Feet",["Hands","Ears"],"We walk on our feet."),
    (T,"body","🖐️","How many hands do we have?","2",["1","3"],"We have 2 hands."),
    (T,"body","👀","How many eyes do we have?","2",["1","3"],"We have 2 eyes."),
    (T,"food","🥛","Which drink comes from a cow?","Milk",["Juice","Water"],"Cows give us milk."),
    (T,"food","🍌","Which fruit is long and yellow?","Banana",["Apple","Orange"],"A banana is long and yellow."),
    (T,"food","🍉","Which fruit is big and red inside?","Watermelon",["Banana","Orange"],"Watermelon is red inside and juicy."),
    (T,"food","💧","What do we drink when we are thirsty?","Water",["Sand","Milk powder"],"Water is best when we are thirsty."),
    (T,"food","🍞","Which one can we eat?","Bread",["Chair","Shoe"],"We can eat bread."),
    (T,"vehicles","🚌","Which one carries many people on the road?","Bus",["Boat","Aeroplane"],"A bus carries many people."),
    (T,"vehicles","✈️","Which one flies in the sky?","Aeroplane",["Car","Boat"],"Aeroplanes fly high in the sky."),
    (T,"vehicles","🚢","Which one sails on the water?","Boat",["Car","Bus"],"Boats sail on water."),
    (T,"vehicles","🚲","Which one has two wheels and pedals?","Bicycle",["Bus","Boat"],"A bicycle has two wheels and pedals."),
    (T,"vehicles","🚒","Which vehicle puts out fires?","Fire engine",["Taxi","Bicycle"],"Fire engines put out fires."),
    (T,"feelings","😊","How does this face feel?","Happy",["Sad","Angry"],"This face is happy!"),
    (T,"feelings","😢","How does this face feel?","Sad",["Happy","Sleepy"],"This face is sad."),
    (T,"feelings","😴","How does this face feel?","Sleepy",["Happy","Angry"],"This face is sleepy."),
    (T,"clothes","👟","What do we wear on our feet?","Shoes",["Hat","Gloves"],"We wear shoes on our feet."),
    (T,"clothes","🧢","What do we wear on our head?","Hat",["Socks","Shoes"],"We wear a hat on our head."),
    (T,"clothes","🧥","What do we wear when it is cold?","Jacket",["Swimsuit","Sandals"],"A warm jacket keeps us cosy."),
    (T,"home","🏠","Where do we live?","House",["Sea","Tree"],"We live in a house."),
    (T,"home","🛏️","Where do we sleep at night?","Bed",["Car","Table"],"We sleep in a bed."),
    (T,"nature","🌧️","What do we use when it rains?","Umbrella",["Sunglasses","Fan"],"An umbrella keeps us dry in the rain. ☂️"),
    (T,"nature","🌳","What grows tall and has leaves?","Tree",["Car","Ball"],"Trees grow tall and have leaves."),
    (T,"nature","🌙","What can we see in the sky at night?","Stars",["Fish","Buses"],"We see stars and the moon at night. ✨"),
    (T,"manners","🧼","Before we eat, we wash our ...","Hands",["Shoes","Hair"],"Clean hands keep us healthy."),
    (T,"manners","🪥","We brush our teeth with a ...","Toothbrush",["Spoon","Comb"],"A toothbrush cleans our teeth."),
    (T,"manners","👋","In the morning we say ...","Good morning",["Go away","Good night"],"We say good morning!"),
    (T,"opposites","⬆️","The opposite of UP is ...","Down",["Over","Under"],"Up and down are opposites."),
    (T,"opposites","🐘","Which one is BIG?","Elephant",["Ant","Bee"],"An elephant is very big!"),
    (T,"opposites","🐜","Which one is SMALL?","Ant",["Elephant","Cow"],"An ant is very small."),

    # ======================================================= nursery (4-5)
    (N,"rhymes","🐱","Which word rhymes with CAT?","Hat",["Dog","Sun"],"Cat and hat rhyme!"),
    (N,"rhymes","☀️","Which word rhymes with SUN?","Run",["Cat","Bed"],"Sun and run rhyme!"),
    (N,"rhymes","🛏️","Which word rhymes with BED?","Red",["Pig","Bus"],"Bed and red rhyme!"),
    (N,"rhymes","🐸","Which word rhymes with FROG?","Dog",["Cat","Sun"],"Frog and dog rhyme!"),
    (N,"rhymes","🐷","Which word rhymes with PIG?","Wig",["Bus","Cow"],"Pig and wig rhyme!"),
    (N,"rhymes","🐝","Which word rhymes with BEE?","Tree",["Dog","Hat"],"Bee and tree rhyme!"),
    (N,"letters","🔤","Which letter comes after C?","D",["B","E"],"A, B, C, D! D comes after C."),
    (N,"letters","🔤","Which letter comes after M?","N",["L","P"],"M, N! N comes after M."),
    (N,"letters","🔤","Which letter comes before Z?","Y",["X","A"],"Y comes just before Z."),
    (N,"letters","🔤","Which letter comes after Q?","R",["P","S"],"Q, R! R comes after Q."),
    (N,"letters","🔡","Which is the small letter for B?","b",["d","p"],"Capital B has the small letter b."),
    (N,"letters","🔡","Which is the small letter for D?","d",["b","p"],"Capital D has the small letter d."),
    (N,"letters","🔡","Which is the small letter for A?","a",["e","o"],"Capital A has the small letter a."),
    (N,"letters","🅰️","Which one is a vowel?","A",["B","C"],"A, E, I, O and U are vowels."),
    (N,"letters","🅰️","Which one is a vowel?","O",["D","T"],"A, E, I, O and U are vowels."),
    (N,"time","🗓️","Which day comes after Monday?","Tuesday",["Sunday","Friday"],"Monday, then Tuesday!"),
    (N,"time","🗓️","Which day comes after Friday?","Saturday",["Monday","Thursday"],"Friday, then Saturday!"),
    (N,"time","🗓️","How many days are in a weekend?","2",["1","3"],"Saturday and Sunday make a weekend."),
    (N,"time","📅","Which is the first month of the year?","January",["March","December"],"January is the first month."),
    (N,"time","📅","Which month comes after January?","February",["March","December"],"January, then February."),
    (N,"time","🌅","When do we eat breakfast?","In the morning",["At night","At midnight"],"Breakfast is in the morning. 🍳"),
    (N,"weather","🌧️","In Nigeria, the season with lots of rain is the ...","Rainy season",["Dry season","Harmattan"],"The rainy season brings lots of rain."),
    (N,"weather","🌬️","The cool, dusty, dry wind season in Nigeria is called ...","Harmattan",["Rainy season","Summer"],"Harmattan is a dry, dusty wind."),
    (N,"senses","👅","What do we use to taste food?","Tongue",["Eyes","Ears"],"We taste with our tongue."),
    (N,"senses","🖐️","What do we use to feel hot and cold?","Skin",["Ears","Eyes"],"We feel with our skin."),
    (N,"health","🍎","Which is a healthy snack?","Apple",["Sweets","Soda"],"Fruit is a healthy snack."),
    (N,"health","🥦","Which food helps us grow strong?","Vegetables",["Sweets","Chips"],"Vegetables help us grow strong."),
    (N,"health","🪥","We should brush our teeth ...","Twice a day",["Never","Once a month"],"Brush in the morning and at night. 🪥"),
    (N,"health","💧","Which drink is best for us?","Water",["Soda","Sweet tea"],"Water is best for our body."),
    (N,"community","👩‍⚕️","Who helps us when we are sick?","Doctor",["Farmer","Driver"],"Doctors and nurses help sick people."),
    (N,"community","👮","Who helps keep us safe?","Police officer",["Chef","Singer"],"Police officers keep us safe."),
    (N,"community","🧑‍🏫","Who teaches us at school?","Teacher",["Pilot","Farmer"],"Teachers help us learn."),
    (N,"community","🧑‍🌾","Who grows our food on a farm?","Farmer",["Doctor","Pilot"],"Farmers grow our food."),
    (N,"community","👨‍✈️","Who flies an aeroplane?","Pilot",["Chef","Teacher"],"Pilots fly aeroplanes."),
    (N,"community","🧑‍🚒","Who puts out fires?","Firefighter",["Teacher","Baker"],"Firefighters put out fires."),
    (N,"transport","🚆","Which one travels on rails?","Train",["Boat","Bicycle"],"Trains run on rails."),
    (N,"transport","🏍️","Which has two wheels and an engine?","Motorbike",["Bus","Boat"],"A motorbike has two wheels and an engine."),
    (N,"transport","🚁","Which one can fly?","Helicopter",["Bus","Train"],"Helicopters fly in the sky."),
    (N,"patterns","🔴","🔴🔵🔴🔵 ... What comes next?","🔴",["🔵","🟢"],"The pattern goes red, blue, red, blue, red!"),
    (N,"patterns","⭐","⭐🌙⭐🌙 ... What comes next?","⭐",["🌙","☀️"],"Star, moon, star, moon, star!"),
    (N,"patterns","🍎","🍎🍌🍎🍌 ... What comes next?","🍎",["🍌","🍇"],"Apple, banana, apple, banana, apple!"),
    (N,"patterns","🟦","🟦🟦🟨🟦🟦🟨 ... What comes next?","🟦",["🟨","🟥"],"Two blue, one yellow, then blue again!"),
    (N,"shapes","⚪","How many corners does a circle have?","0",["1","4"],"A circle is round with no corners."),
    (N,"shapes","🔺","Which shape has 3 corners?","Triangle",["Square","Circle"],"A triangle has 3 corners."),
    (N,"shapes","▭","How many sides does a rectangle have?","4",["3","5"],"A rectangle has 4 sides."),
    (N,"safety","🚦","When we cross the road we look ...","Left and right",["Up only","Down only"],"Always look left and right before crossing. 👀"),
    (N,"safety","🧍","If you feel lost, who can you ask for help?","A police officer or teacher",["Nobody","A stranger offering sweets"],"Ask a trusted grown-up like a teacher or police officer."),
    (N,"plants","🌱","Which part of a plant is under the soil?","Root",["Leaf","Flower"],"Roots grow under the soil and drink water."),
    (N,"plants","🌸","Which part of a plant is colourful and smells nice?","Flower",["Root","Stem"],"Flowers are colourful and smell nice. 🌸"),
    (N,"plants","🌰","What grows from a seed?","A plant",["A rock","A toy"],"Seeds grow into plants."),
    (N,"plants","🥭","Which fruit grows on a tree?","Mango",["Carrot","Yam"],"Mangoes grow on trees."),
    (N,"animals","🐦","Where does a bird live?","Nest",["Hole","Pond"],"Birds live in nests."),
    (N,"animals","🐕","Where does a dog live?","Kennel",["Nest","Web"],"A dog can live in a kennel."),
    (N,"animals","🐝","Where do bees live?","Hive",["Nest","Pond"],"Bees live in a hive."),
    (N,"animals","🐱","A baby cat is called a ...","Kitten",["Puppy","Chick"],"A baby cat is a kitten."),
    (N,"animals","🐶","A baby dog is called a ...","Puppy",["Kitten","Calf"],"A baby dog is a puppy."),
    (N,"animals","🐥","A baby hen is called a ...","Chick",["Calf","Kitten"],"A baby hen is a chick."),
    (N,"animals","🐄","A baby cow is called a ...","Calf",["Chick","Puppy"],"A baby cow is a calf."),
    (N,"nigeria","🍲","Which of these is a Nigerian food?","Egusi soup",["Sushi","Hot dog"],"Egusi soup is loved in Nigeria!"),
    (N,"nigeria","🫘","Akara is made from ...","Beans",["Rice","Yam"],"Akara is made from beans."),
    (N,"nigeria","🌊","Which big Nigerian city is by the sea?","Lagos",["Kano","Jos"],"Lagos is by the Atlantic Ocean."),
    (N,"nigeria","🇳🇬","How many colours are on the Nigerian flag?","2",["3","4"],"Green and white: two colours!"),
    (N,"opposites","🥛","The opposite of FULL is ...","Empty",["Big","Heavy"],"Full and empty are opposites."),
    (N,"opposites","🚪","The opposite of OPEN is ...","Closed",["Wide","Up"],"Open and closed are opposites."),
    (N,"opposites","🐢","The opposite of FAST is ...","Slow",["Tall","Loud"],"Fast and slow are opposites."),
    (N,"opposites","🧸","The opposite of SOFT is ...","Hard",["Cold","Wet"],"Soft and hard are opposites."),
    (N,"opposites","🪶","The opposite of HEAVY is ...","Light",["Hard","Short"],"Heavy and light are opposites."),
    (N,"opposites","💧","The opposite of WET is ...","Dry",["Cold","Soft"],"Wet and dry are opposites."),
    (N,"manners","🙏","When someone helps us we say ...","Thank you",["Go away","Give me"],"We always say thank you."),
    (N,"manners","🤧","When we sneeze we cover our nose and mouth with a ...","Tissue or elbow",["Shoe","Ball"],"Cover a sneeze to stop germs spreading."),
    (N,"money","💵","Which one is money?","A naira note",["A leaf","A stone"],"Naira notes are money."),

    # ======================================================= lower (6-8)
    (L,"english","📖","Choose the right word: She ___ to school.","goes",["go","going"],"She goes to school. (she → goes)"),
    (L,"english","📖","Choose the right word: They ___ playing football.","are",["is","am"],"They are playing."),
    (L,"english","📖","Choose the right word: I ___ a book yesterday.","read",["readed","reading"],"I read a book. (read stays read)"),
    (L,"english","📖","Choose the right word: He ___ happy.","is",["are","am"],"He is happy."),
    (L,"english","📦","The plural of 'box' is ...","boxes",["boxs","boxen"],"Add 'es' to words ending in x: boxes."),
    (L,"english","👶","The plural of 'baby' is ...","babies",["babys","babyes"],"Change y to ies: babies."),
    (L,"english","🍃","The plural of 'leaf' is ...","leaves",["leafs","leafes"],"Leaf → leaves."),
    (L,"english","🦶","The plural of 'foot' is ...","feet",["foots","feets"],"Foot → feet."),
    (L,"english","🦷","The plural of 'tooth' is ...","teeth",["tooths","teeths"],"Tooth → teeth."),
    (L,"english","🐑","The plural of 'sheep' is ...","sheep",["sheeps","sheepes"],"Sheep stays sheep!"),
    (L,"english","🌞","The opposite of 'early' is ...","late",["soon","fast"],"Early and late are opposites."),
    (L,"english","🪣","The opposite of 'empty' is ...","full",["small","low"],"Empty and full are opposites."),
    (L,"english","💬","A word that means the same as 'quick' is ...","fast",["slow","heavy"],"Quick and fast mean the same."),
    (L,"english","💬","A word that means the same as 'begin' is ...","start",["stop","end"],"Begin and start mean the same."),
    (L,"english","💬","A word that means the same as 'tiny' is ...","small",["huge","long"],"Tiny and small mean the same."),
    (L,"english","✍️","Which word is spelt correctly?","beautiful",["beutiful","beatiful"],"The correct spelling is b-e-a-u-t-i-f-u-l."),
    (L,"english","✍️","Which word is spelt correctly?","together",["togather","togethar"],"The correct spelling is t-o-g-e-t-h-e-r."),
    (L,"english","✍️","Which word is spelt correctly?","school",["scool","skool"],"The correct spelling is s-c-h-o-o-l."),
    (L,"english","❓","Which sentence is written correctly?","What is your name?",["what is your name.","What is your name"],"A question starts with a capital letter and ends with ?"),
    (L,"english","🔚","We put a full stop at the ...","end of a sentence",["start of a sentence","middle of a word"],"A full stop (.) ends a sentence."),
    (L,"english","☀️","Sun + flower = ?","sunflower",["flowersun","sunflour"],"Two words join to make 'sunflower'."),
    (L,"english","⚽","Foot + ball = ?","football",["ballfoot","feetball"],"Foot + ball = football."),
    (L,"english","🌈","Rain + bow = ?","rainbow",["bowrain","rainbaw"],"Rain + bow = rainbow."),
    (L,"english","🔤","Which word comes first in the dictionary?","apple",["banana","cat"],"Alphabetical order: apple, banana, cat."),
    (L,"english","🔤","Which word comes first in the dictionary?","dog",["egg","fish"],"Alphabetical order: dog, egg, fish."),
    (L,"english","⚽","Tunde has a red ball. What colour is Tunde's ball?","red",["blue","green"],"Tunde has a RED ball."),
    (L,"english","🐔","Ada feeds the hen every morning. Who feeds the hen?","Ada",["Tunde","The farmer"],"Ada feeds the hen."),
    (L,"english","🌇","The sun set and the sky turned orange. What time of day is it?","evening",["morning","noon"],"The sun sets in the evening."),
    (L,"science","🌳","Which one is a living thing?","tree",["stone","chair"],"Trees are alive: they grow and make seeds."),
    (L,"science","🪨","Which one is NOT a living thing?","rock",["bird","fish"],"Rocks do not grow, eat or breathe."),
    (L,"science","🕷️","How many legs does a spider have?","8",["6","4"],"Spiders have 8 legs."),
    (L,"science","🐜","How many legs does an insect have?","6",["4","8"],"Insects have 6 legs."),
    (L,"science","🐄","Which animal is a mammal?","goat",["hen","crocodile"],"Mammals feed milk to their babies, like goats."),
    (L,"science","🐦","Birds have ...","feathers",["fur","scales"],"Birds have feathers."),
    (L,"science","🐟","Fish breathe with their ...","gills",["lungs","wings"],"Fish breathe through gills."),
    (L,"science","🐸","Which animal can live on land and in water?","frog",["cow","goat"],"Frogs live on land and in water."),
    (L,"science","🌿","The part of a plant that holds it up is the ...","stem",["root","petal"],"The stem holds the plant up."),
    (L,"science","🍃","Plants make their food in their ...","leaves",["roots","seeds"],"Leaves use sunlight to make food."),
    (L,"science","🪟","Which material can you see through?","glass",["wood","metal"],"Glass is see-through (transparent)."),
    (L,"science","🪵","Which one floats on water?","a wooden block",["a stone","a coin"],"Wood floats; stones and coins sink."),
    (L,"science","☁️","Clouds are made of tiny drops of ...","water",["smoke","cotton"],"Clouds are tiny water drops."),
    (L,"science","🌍","The Earth turns around once every ...","24 hours",["1 hour","7 days"],"One full turn makes one day and night: 24 hours."),
    (L,"science","🪐","How many planets are in our solar system?","8",["7","9"],"There are 8 planets."),
    (L,"science","🌙","The Moon goes around the ...","Earth",["Sun","Mars"],"The Moon orbits the Earth."),
    (L,"health","🧼","Germs spread when we do NOT wash our ...","hands",["shoes","hair"],"Washing hands stops germs spreading."),
    (L,"health","🦷","How many times a day should we brush our teeth?","2",["5","0"],"Brush twice a day: morning and night."),
    (L,"nigeria","🏙️","What is the capital of Lagos State?","Ikeja",["Abuja","Epe"],"Ikeja is the capital of Lagos State."),
    (L,"nigeria","🏙️","Which state has Ibadan as its capital?","Oyo",["Ogun","Kano"],"Ibadan is the capital of Oyo State."),
    (L,"nigeria","🏙️","Port Harcourt is in which state?","Rivers",["Lagos","Kano"],"Port Harcourt is in Rivers State."),
    (L,"nigeria","🧭","Kano is in which part of Nigeria?","North",["South","West"],"Kano is in the north."),
    (L,"nigeria","🌍","Nigeria is in which part of Africa?","West Africa",["East Africa","North Africa"],"Nigeria is in West Africa."),
    (L,"nigeria","🪨","Zuma Rock is near which city?","Abuja",["Kano","Lagos"],"Zuma Rock is near Abuja."),
    (L,"nigeria","🗣️","Which of these is a Nigerian language?","Igbo",["Spanish","German"],"Igbo is a Nigerian language, like Yoruba and Hausa."),
    (L,"nigeria","💵","What is the symbol for the naira?","₦",["$","£"],"The naira is written ₦."),
    (L,"world","🐘","Which is the tallest animal?","giraffe",["elephant","horse"],"Giraffes are the tallest animals."),
    (L,"world","🏜️","The Sahara is a very big ...","desert",["lake","forest"],"The Sahara is a huge desert in Africa."),
    (L,"world","🌅","The Sun rises in the ...","east",["west","north"],"The Sun rises in the east and sets in the west."),
    (L,"world","🌍","How many continents are there?","7",["5","9"],"There are 7 continents."),
    (L,"world","🇪🇬","Egypt is on which continent?","Africa",["Asia","Europe"],"Egypt is in Africa."),
    (L,"time","🕐","How many hours are in one day?","24",["12","60"],"A day has 24 hours."),
    (L,"time","📅","Which month has 31 days?","January",["April","June"],"January has 31 days."),
    (L,"time","📅","How many days are in February in a normal year?","28",["30","31"],"February has 28 days (29 in a leap year)."),
    (L,"time","🗓️","Which day comes after Wednesday?","Thursday",["Tuesday","Friday"],"Wednesday, then Thursday."),
    (L,"time","🕕","The short hand is on 6 and the long hand is on 12. What time is it?","6 o'clock",["12 o'clock","half past 6"],"Long hand on 12 means o'clock."),
    (L,"time","🕞","The short hand is between 3 and 4 and the long hand is on 6. What time is it?","half past 3",["6 o'clock","quarter past 3"],"Long hand on 6 means half past."),
    (L,"time","⏱️","A quarter of an hour is how many minutes?","15",["10","30"],"60 ÷ 4 = 15 minutes."),
    (L,"shapes","🧊","How many faces does a cube have?","6",["4","8"],"A cube has 6 faces."),
    (L,"shapes","⚽","Which 3D shape is like a ball?","sphere",["cube","cone"],"A ball is a sphere."),
    (L,"shapes","🥫","A tin of milk is shaped like a ...","cylinder",["cube","sphere"],"A tin is a cylinder."),
    (L,"shapes","▭","How many corners does a rectangle have?","4",["3","6"],"A rectangle has 4 corners."),
    (L,"shapes","⬠","How many sides does a pentagon have?","5",["6","8"],"Penta means five."),
    (L,"shapes","🛑","How many sides does an octagon have?","8",["6","10"],"Octa means eight. A STOP sign is an octagon."),
    (L,"computers","⌨️","Which one do we use to type?","keyboard",["screen","speaker"],"We type with a keyboard."),
    (L,"computers","🖱️","Which one do we use to point and click?","mouse",["keyboard","printer"],"A mouse moves the pointer."),
    (L,"computers","🖥️","Where do we see pictures on a computer?","screen",["keyboard","mouse"],"Pictures appear on the screen."),
    (L,"computers","🔐","Who should know your password?","only you and a parent",["every friend","any stranger"],"Keep passwords secret."),

    # ======================================================= upper (9-11)
    (U,"english","📖","Choose the right word: Yesterday I ___ to the market.","went",["go","goes"],"Past tense of go is went."),
    (U,"english","📖","Choose the right word: ___ is my best friend.","She",["Her","Hers"],"'She' is the subject pronoun."),
    (U,"english","📖","The cat is ___ the table.","under",["very","because"],"'Under' tells us where the cat is (a preposition)."),
    (U,"english","📖","I like tea ___ I do not like coffee.","but",["so","or"],"'But' joins two different ideas."),
    (U,"english","📖","She sings ___.","beautifully",["beautiful","beauty"],"'Beautifully' is an adverb: it tells how she sings."),
    (U,"english","📖","___ apple a day keeps the doctor away.","An",["A","The"],"Use 'an' before a vowel sound."),
    (U,"english","📖","The boys ___ playing outside.","are",["is","was"],"Plural subject 'boys' takes 'are'."),
    (U,"english","📖","Which is correct?","The dog's bone",["The dogs bone","The dogs' bone's"],"An apostrophe + s shows belonging: the dog's bone."),
    (U,"english","📖","Which word is a conjunction?","because",["quickly","table"],"'Because' joins parts of a sentence."),
    (U,"english","📖","A group of birds is called a ...","flock",["herd","shoal"],"A flock of birds."),
    (U,"english","📖","A group of fish is called a ...","shoal",["flock","pack"],"A shoal of fish."),
    (U,"english","📖","A group of cattle is called a ...","herd",["flock","bunch"],"A herd of cattle."),
    (U,"english","📖","'___ going to school now' (They are)","They're",["Their","There"],"They're = they are."),
    (U,"english","📖","Which is a simile?","as brave as a lion",["the lion roared","a lion is an animal"],"A simile compares using 'as' or 'like'."),
    (U,"english","📖","What does 'enormous' mean?","very big",["very small","very fast"],"Enormous means extremely large."),
    (U,"english","📖","What does 'reluctant' mean?","unwilling",["happy","fast"],"Reluctant means not wanting to do something."),
    (U,"english","📖","'It is raining cats and dogs' means ...","raining very heavily",["cats are falling","it is sunny"],"It is an idiom for very heavy rain."),
    (U,"english","📖","'Break a leg!' is a way to say ...","good luck",["be careful","goodbye"],"Actors say 'break a leg' to wish good luck."),
    (U,"english","📖","The opposite of 'generous' is ...","selfish",["kind","rich"],"Generous and selfish are opposites."),
    (U,"english","📖","Which sentence uses a comma correctly?","Tola bought rice, beans and yam.",["Tola bought, rice beans and yam.","Tola, bought rice beans, and yam."],"Commas separate items in a list."),
    (U,"science","🧊","Ice turning into water is a change from ...","solid to liquid",["liquid to gas","gas to solid"],"Melting: solid → liquid."),
    (U,"science","♨️","Water vapour turning into tiny drops in a cloud is called ...","condensation",["evaporation","melting"],"Condensation: gas → liquid."),
    (U,"science","🌧️","Rain, snow and hail are all called ...","precipitation",["evaporation","pollution"],"Water falling from clouds is precipitation."),
    (U,"science","🌱","Plants take in carbon dioxide and give out ...","oxygen",["nitrogen","smoke"],"Photosynthesis makes oxygen."),
    (U,"science","🌿","In a food chain, plants are called ...","producers",["consumers","predators"],"Plants make their own food: producers."),
    (U,"science","🐄","Which animal is a herbivore (plant eater)?","cow",["lion","crocodile"],"Cows eat only plants."),
    (U,"science","🦁","Which animal is a carnivore (meat eater)?","lion",["cow","goat"],"Lions eat meat."),
    (U,"science","🙂","Humans eat both plants and meat, so they are ...","omnivores",["herbivores","carnivores"],"Omnivores eat plants and animals."),
    (U,"science","🍎","What force pulls things down to the ground?","gravity",["magnetism","friction"],"Gravity pulls objects towards the Earth."),
    (U,"science","🔌","Which material is a good conductor of electricity?","copper",["rubber","wood"],"Copper lets electricity flow easily."),
    (U,"science","🧤","Which material is an insulator?","rubber",["copper","iron"],"Rubber does not let electricity flow."),
    (U,"science","🧲","Opposite poles of two magnets ...","attract",["repel","vanish"],"North and south poles attract."),
    (U,"science","🧲","Like poles of two magnets (north and north) ...","repel",["attract","melt"],"Like poles push apart."),
    (U,"science","💡","Light travels in ... lines.","straight",["curly","zigzag"],"Light travels in straight lines."),
    (U,"science","🔊","Sound cannot travel through ...","a vacuum (empty space)",["water","air"],"Sound needs something to travel through."),
    (U,"science","⭐","The Sun is a ...","star",["planet","moon"],"The Sun is a star."),
    (U,"science","🫁","Which organ do we use to breathe?","lungs",["heart","stomach"],"Our lungs take in oxygen."),
    (U,"science","🧬","Which organs clean the blood and make urine?","kidneys",["lungs","brain"],"Kidneys filter our blood."),
    (U,"science","🦴","How many bones does an adult human have?","206",["106","306"],"Adults have 206 bones."),
    (U,"science","🍗","Which nutrient helps build muscles?","protein",["sugar","salt"],"Protein builds and repairs muscles."),
    (U,"science","☀️","Which vitamin do we get from sunshine?","vitamin D",["vitamin C","vitamin K"],"Sunlight helps our skin make vitamin D."),
    (U,"science","🍚","Carbohydrates (like rice and yam) give us ...","energy",["bones","sleep"],"Carbohydrates are our main energy food."),
    (U,"science","🔴","Which planet is called the Red Planet?","Mars",["Venus","Jupiter"],"Mars looks red."),
    (U,"science","🪐","Which planet has famous rings?","Saturn",["Mars","Earth"],"Saturn has bright rings."),
    (U,"science","🌋","The outer layer of the Earth is called the ...","crust",["core","mantle"],"We live on the Earth's crust."),
    (U,"science","🌬️","Which is a renewable energy source?","wind",["coal","petrol"],"Wind never runs out."),
    (U,"science","⛽","Which one is a fossil fuel?","coal",["wind","sunlight"],"Coal formed from ancient plants."),
    (U,"science","🧊","Which change can be reversed?","melting ice",["burning paper","baking a cake"],"Water can freeze again; burnt paper cannot unburn."),
    (U,"nigeria","🏙️","What is the capital of Rivers State?","Port Harcourt",["Ibadan","Kaduna"],"Port Harcourt is the capital of Rivers State."),
    (U,"nigeria","🏙️","What is the capital of Oyo State?","Ibadan",["Abeokuta","Ilorin"],"Ibadan is the capital of Oyo State."),
    (U,"nigeria","🏙️","What is the capital of Kaduna State?","Kaduna",["Kano","Jos"],"Kaduna is the capital of Kaduna State."),
    (U,"nigeria","🌊","Which ocean is south of Nigeria?","Atlantic Ocean",["Indian Ocean","Pacific Ocean"],"Nigeria's coast is on the Atlantic Ocean."),
    (U,"nigeria","🧭","Which country is on Nigeria's western border?","Benin",["Ghana","Chad"],"Benin is Nigeria's western neighbour."),
    (U,"nigeria","🧭","Which of these does NOT border Nigeria?","Ghana",["Niger","Cameroon"],"Ghana is not next to Nigeria."),
    (U,"nigeria","🌊","Which two big rivers meet at Lokoja?","Niger and Benue",["Nile and Congo","Niger and Volta"],"The Niger and Benue meet at Lokoja."),
    (U,"nigeria","⛰️","What is the highest mountain in Nigeria?","Chappal Waddi",["Zuma Rock","Olumo Rock"],"Chappal Waddi is Nigeria's highest point."),
    (U,"nigeria","🏛️","Which city was Nigeria's capital before Abuja?","Lagos",["Kano","Ibadan"],"Lagos was the capital until 1991."),
    (U,"nigeria","📜","In which year did Nigeria become independent?","1960",["1950","1970"],"Nigeria became independent on 1st October 1960."),
    (U,"nigeria","📜","Who was Nigeria's first Prime Minister?","Abubakar Tafawa Balewa",["Nnamdi Azikiwe","Obafemi Awolowo"],"Sir Abubakar Tafawa Balewa led the country at independence."),
    (U,"nigeria","📜","Who was Nigeria's first President?","Nnamdi Azikiwe",["Abubakar Tafawa Balewa","Herbert Macaulay"],"Dr Nnamdi Azikiwe became the first President in 1963."),
    (U,"nigeria","📚","Which Nigerian won the Nobel Prize in Literature in 1986?","Wole Soyinka",["Chinua Achebe","Ben Okri"],"Wole Soyinka was the first African to win it."),
    (U,"nigeria","🏛️","Who makes laws in Nigeria?","The National Assembly",["The Police","The Army"],"The National Assembly (Senate and House of Representatives) makes laws."),
    (U,"nigeria","🗳️","What is the minimum age to vote in Nigeria?","18",["16","21"],"You can vote from age 18."),
    (U,"world","🏙️","What is the capital of Ghana?","Accra",["Lagos","Kumasi"],"Accra is the capital of Ghana."),
    (U,"world","🏙️","What is the capital of Kenya?","Nairobi",["Mombasa","Kampala"],"Nairobi is Kenya's capital."),
    (U,"world","🏙️","What is the capital of Egypt?","Cairo",["Alexandria","Giza"],"Cairo is Egypt's capital."),
    (U,"world","🏙️","What is the capital of Senegal?","Dakar",["Accra","Abidjan"],"Dakar is Senegal's capital."),
    (U,"world","🏙️","What is the capital of Ethiopia?","Addis Ababa",["Nairobi","Khartoum"],"Addis Ababa is Ethiopia's capital."),
    (U,"world","🌊","Which is the longest river in Africa?","Nile",["Niger","Congo"],"The Nile is Africa's longest river."),
    (U,"world","🌏","Which is the smallest continent?","Australia (Oceania)",["Europe","Africa"],"Australia/Oceania is the smallest continent."),
    (U,"world","🧭","Nigeria is in which half of the Earth (hemisphere)?","Northern",["Southern","Neither"],"Nigeria lies north of the equator."),
    (U,"computers","💻","What does CPU stand for?","Central Processing Unit",["Computer Power Unit","Central Program User"],"The CPU is the brain of the computer."),
    (U,"computers","🖨️","Which one is an OUTPUT device?","printer",["keyboard","mouse"],"A printer puts out information."),
    (U,"computers","🌐","What does 'www' stand for?","World Wide Web",["Web World Wide","Wide Web World"],"www = World Wide Web."),
    (U,"computers","🛡️","A program that protects a computer from viruses is called ...","antivirus",["keyboard","browser"],"Antivirus software protects computers."),
    (U,"computers","🔐","Which is the strongest password?","a mix of letters, numbers and symbols",["your name","12345"],"Long, mixed passwords are hardest to guess."),
    (U,"computers","🙅","Which is safe to share online?","your favourite colour",["your home address","your password"],"Never share addresses or passwords."),
    (U,"health","🦟","Malaria is spread by ...","mosquitoes",["flies","dogs"],"Mosquito bites spread malaria."),
    (U,"health","🛏️","Which helps protect us from malaria?","sleeping under a treated net",["eating more sugar","staying indoors all day"],"Treated nets stop mosquitoes biting at night."),
    (U,"health","🚰","Cholera spreads through ...","dirty water",["clean water","sunlight"],"Always drink safe, clean water."),
    (U,"health","🧼","To wash hands well, scrub with soap for at least ...","20 seconds",["2 seconds","5 minutes"],"Scrub for 20 seconds."),
    (U,"health","🍬","Too many sweets harm our ...","teeth",["eyes","ears"],"Sugar causes tooth decay."),
]


def _opts(rng: random.Random, answer: int, lo: int, hi: int) -> list[str]:
    cands = [answer + d for d in (-10, -2, -1, 1, 2, 10, 5) if lo <= answer + d <= hi and answer + d != answer]
    rng.shuffle(cands)
    out = list(dict.fromkeys(cands))[:2]
    while len(out) < 2:
        v = rng.randint(lo, hi)
        if v != answer and v not in out:
            out.append(v)
    return [str(v) for v in out]


def more_generated() -> list[tuple]:
    rng = random.Random(7)
    out: list[tuple] = []
    emo = ["🍎", "⭐", "🐟", "🎈", "🐥", "🌸", "🚗", "🍌", "🐞", "🧁", "🍊", "🦋"]

    # tiny: counting 1-5 with fresh emojis
    for n in range(1, 6):
        for e in emo[3:7]:
            out.append((T, "numbers", e * n, "How many can you count?", str(n), _opts(rng, n, 1, 6), f"There are {n}! 🎉"))

    # nursery: counting 6-12, number after/before, bigger/smaller, skip counting, missing number, small add/sub
    for n in range(6, 13):
        e = emo[n % len(emo)]
        out.append((N, "numbers", e * n, "How many can you count?", str(n), _opts(rng, n, 1, 14), f"There are {n}!"))
    for n in range(1, 20):
        out.append((N, "numbers", "🔢", f"What number comes after {n}?", str(n + 1), _opts(rng, n + 1, 1, 21), f"After {n} comes {n + 1}."))
    for n in range(2, 20, 2):
        out.append((N, "numbers", "🔢", f"What number comes before {n}?", str(n - 1), _opts(rng, n - 1, 0, 20), f"Before {n} comes {n - 1}."))
    for a, b in [(3, 7), (9, 4), (6, 8), (12, 5), (15, 11), (2, 9), (14, 18), (10, 6)]:
        out.append((N, "numbers", "⚖️", f"Which number is bigger: {a} or {b}?", str(max(a, b)), [str(min(a, b)), str(max(a, b) + 1)], f"{max(a, b)} is bigger than {min(a, b)}."))
        out.append((N, "numbers", "⚖️", f"Which number is smaller: {a} or {b}?", str(min(a, b)), [str(max(a, b)), str(min(a, b) + 20)], f"{min(a, b)} is smaller than {max(a, b)}."))
    for start in (2, 4, 6, 8):
        seq = [start, start + 2, start + 4, start + 6]
        out.append((N, "numbers", "🧮", f"Count by 2s: {seq[0]}, {seq[1]}, {seq[2]}, ...", str(seq[3]), _opts(rng, seq[3], 1, 20), f"We add 2 each time: {seq[3]}."))
    for a in (1, 3, 5, 2, 4):
        out.append((N, "numbers", "🧩", f"What number is missing? {a}, {a + 1}, _, {a + 3}", str(a + 2), _opts(rng, a + 2, 1, 10), f"{a}, {a + 1}, {a + 2}, {a + 3}"))
    for a in range(1, 6):
        for b in range(1, 6):
            if a + b <= 10 and (a + b) % 2 == 0:
                out.append((N, "maths", "➕", f"{a} + {b} = ?", str(a + b), _opts(rng, a + b, 1, 11), f"{a} + {b} = {a + b}"))
    for a in range(4, 11, 2):
        b = rng.randint(1, a - 1)
        out.append((N, "maths", "➖", f"{a} - {b} = ?", str(a - b), _opts(rng, a - b, 0, 10), f"{a} - {b} = {a - b}"))
    # nursery letters: more words
    words = [("🪑", "Chair", "C"), ("🐐", "Goat", "G"), ("🍠", "Yam", "Y"), ("🧸", "Teddy", "T"), ("🚪", "Door", "D"), ("🌽", "Corn", "C"),
             ("🍍", "Pineapple", "P"), ("🍋", "Lemon", "L"), ("🐜", "Ant", "A"), ("🚗", "Car", "C"), ("🛏️", "Bed", "B"), ("🔑", "Key", "K"),
             ("🥭", "Mango", "M"), ("🐓", "Hen", "H"), ("🦅", "Eagle", "E"), ("🌴", "Palm tree", "P"), ("🍞", "Bread", "B"), ("🦆", "Duck", "D")]
    letters = "ABCDEFGHIJKLMNOPRSTWY"
    for e, w, l in words:
        wrong = [c for c in letters if c != l]
        rng.shuffle(wrong)
        out.append((N, "letters", e, f"{w} starts with which letter?", l, wrong[:2], f"{w} starts with {l}!"))

    # lower: maths
    for _ in range(18):
        a, b = rng.randint(21, 68), rng.randint(11, 29)
        out.append((L, "maths", "➕", f"{a} + {b} = ?", str(a + b), _opts(rng, a + b, 20, 110), f"{a} + {b} = {a + b}"))
    for _ in range(14):
        a = rng.randint(45, 99); b = rng.randint(11, a - 20)
        out.append((L, "maths", "➖", f"{a} - {b} = ?", str(a - b), _opts(rng, a - b, 5, 95), f"{a} - {b} = {a - b}"))
    for n in (36, 47, 58, 63, 74, 85, 92):
        out.append((L, "maths", "🔢", f"In the number {n}, the digit {str(n)[0]} means ...", f"{int(str(n)[0]) * 10}", [str(int(str(n)[0])), str(int(str(n)[0]) * 100)], f"{str(n)[0]} is in the tens place, so it means {int(str(n)[0]) * 10}."))
    for n in (23, 36, 48, 51, 64, 77):
        out.append((L, "maths", "➕", f"What is 10 more than {n}?", str(n + 10), _opts(rng, n + 10, 10, 100), f"{n} + 10 = {n + 10}"))
        out.append((L, "maths", "➖", f"What is 10 less than {n + 10}?", str(n), _opts(rng, n, 0, 100), f"{n + 10} - 10 = {n}"))
    for n in (6, 8, 12, 14, 16, 18, 20, 24):
        out.append((L, "maths", "🍰", f"What is half of {n}?", str(n // 2), _opts(rng, n // 2, 1, 15), f"Half of {n} is {n // 2}."))
        out.append((L, "maths", "🔁", f"What is double {n // 2}?", str(n), _opts(rng, n, 2, 30), f"Double {n // 2} is {n}."))
    for t in (3, 4):
        for k in (2, 3, 5, 6, 7, 8):
            out.append((L, "maths", "✖️", f"{t} × {k} = ?", str(t * k), _opts(rng, t * k, 3, 40), f"{t} × {k} = {t * k}"))
    for price, have in [(8, 20), (15, 50), (25, 100), (35, 100), (60, 100), (45, 50), (12, 30)]:
        out.append((L, "money", "💵", f"Tola has ₦{have} and buys a pencil for ₦{price}. How much is left?", f"₦{have - price}",
                    [f"₦{have - price + 5}", f"₦{have + price}"], f"₦{have} - ₦{price} = ₦{have - price}"))
    for note, total in [(50, 200), (20, 100), (10, 60), (100, 500)]:
        out.append((L, "money", "💵", f"How many ₦{note} notes make ₦{total}?", str(total // note), _opts(rng, total // note, 1, 12), f"{total} ÷ {note} = {total // note}"))
    for start in (2, 3, 4, 5):
        seq = [start * k for k in (1, 2, 3, 4)]
        out.append((L, "maths", "🧮", f"What comes next? {seq[0]}, {seq[1]}, {seq[2]}, {seq[3]}, ...", str(start * 5), _opts(rng, start * 5, 2, 30), f"We count in {start}s."))

    # upper: maths
    for _ in range(14):
        a, b = rng.randint(11, 15), rng.randint(6, 12)
        out.append((U, "maths", "✖️", f"{a} × {b} = ?", str(a * b), _opts(rng, a * b, 50, 200), f"{a} × {b} = {a * b}"))
    for _ in range(10):
        b, q = rng.randint(6, 12), rng.randint(11, 25)
        out.append((U, "maths", "➗", f"{b * q} ÷ {b} = ?", str(q), _opts(rng, q, 5, 40), f"{b * q} ÷ {b} = {q}"))
    for whole, num, den in [(20, 3, 4), (24, 2, 3), (30, 1, 5), (40, 3, 8), (36, 5, 6), (18, 1, 3), (50, 2, 5), (45, 4, 9)]:
        ans = whole * num // den
        out.append((U, "maths", "🍕", f"What is {num}/{den} of {whole}?", str(ans), _opts(rng, ans, 2, 45), f"{whole} ÷ {den} = {whole // den}, then × {num} = {ans}."))
    for pct, whole in [(10, 50), (50, 80), (25, 40), (10, 230), (20, 60), (75, 200), (50, 130), (5, 100)]:
        ans = pct * whole // 100
        out.append((U, "maths", "💯", f"What is {pct}% of {whole}?", str(ans), _opts(rng, ans, 1, 160), f"{pct}% of {whole} = {ans}."))
    for l, w in [(8, 5), (12, 7), (10, 6), (15, 4), (9, 9)]:
        out.append((U, "maths", "📐", f"A rectangle is {l} cm long and {w} cm wide. What is its perimeter?", f"{2 * (l + w)} cm", [f"{l * w} cm", f"{l + w} cm"], f"Perimeter = 2 × ({l} + {w}) = {2 * (l + w)} cm."))
        out.append((U, "maths", "📏", f"A rectangle is {l} cm long and {w} cm wide. What is its area?", f"{l * w} cm²", [f"{2 * (l + w)} cm²", f"{l + w} cm²"], f"Area = {l} × {w} = {l * w} cm²."))
    for a, b in [(60, 70), (45, 90), (35, 100), (80, 55)]:
        out.append((U, "maths", "📐", f"Two angles of a triangle are {a}° and {b}°. What is the third angle?", f"{180 - a - b}°", [f"{180 - a - b + 10}°", f"{a + b}°"], f"Angles in a triangle add up to 180°: 180 - {a} - {b} = {180 - a - b}."))
    for roman, val in [("VII", 7), ("IX", 9), ("XIV", 14), ("XX", 20), ("XL", 40), ("L", 50), ("XXV", 25), ("XIX", 19)]:
        out.append((U, "maths", "🏛️", f"What number is the Roman numeral {roman}?", str(val), _opts(rng, val, 1, 60), f"{roman} = {val}."))
    for n in (47, 86, 132, 458, 764, 1249):
        base = 10 if n < 100 else 100
        r = round(n / base) * base
        out.append((U, "maths", "🎯", f"Round {n} to the nearest {base}.", str(r), [str(r + base), str(r - base)], f"{n} rounds to {r}."))
    for n in (3, 4, 5, 6, 7, 8, 9, 11, 12):
        out.append((U, "maths", "🟦", f"What is {n} × {n} (that is, {n} squared)?", str(n * n), _opts(rng, n * n, 4, 150), f"{n} × {n} = {n * n}."))
    for pool, ans in [("Which is a factor of 12?", ("4", ["5", "7"])), ("Which is a factor of 20?", ("5", ["3", "6"])), ("Which is a factor of 18?", ("9", ["4", "5"])),
                      ("Which is a multiple of 7?", ("21", ["27", "17"])), ("Which is a multiple of 9?", ("36", ["46", "29"])), ("Which is a multiple of 6?", ("30", ["32", "25"])),
                      ("Which number is prime?", ("13", ["9", "15"])), ("Which number is prime?", ("17", ["21", "27"])), ("Which number is NOT prime?", ("15", ["11", "7"]))]:
        out.append((U, "maths", "🔢", pool, ans[0], ans[1], "Think about which numbers divide evenly."))
    for nums in [(4, 6, 8), (10, 20, 30), (5, 7, 9), (12, 15, 18)]:
        avg = sum(nums) // 3
        out.append((U, "maths", "📊", f"What is the average of {nums[0]}, {nums[1]} and {nums[2]}?", str(avg), _opts(rng, avg, 2, 30), f"({nums[0]} + {nums[1]} + {nums[2]}) ÷ 3 = {avg}."))
    for km, hr in [(60, 2), (120, 3), (100, 4), (90, 3)]:
        out.append((U, "maths", "🚗", f"A bus travels {km} km in {hr} hours. How fast is it going (km per hour)?", str(km // hr), _opts(rng, km // hr, 5, 80), f"{km} ÷ {hr} = {km // hr} km/h."))
    for cost, qty in [(150, 6), (250, 4), (75, 8), (120, 5)]:
        out.append((U, "money", "🛒", f"One exercise book costs ₦{cost}. How much do {qty} books cost?", f"₦{cost * qty}", [f"₦{cost * qty + 50}", f"₦{cost + qty}"], f"₦{cost} × {qty} = ₦{cost * qty}."))
    for a, b in [(0.5, 0.25), (1.2, 0.8), (2.5, 1.5), (0.75, 0.25)]:
        out.append((U, "maths", "➕", f"{a} + {b} = ?", f"{a + b:g}", [f"{a + b + 0.5:g}", f"{abs(a - b):g}"], f"{a} + {b} = {a + b:g}."))
    return out
