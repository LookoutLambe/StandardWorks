// pgp_verses/moses.js — Moses verse data
(function() {
var ms_ch1Verses = [
  { num: "א", words: [
    ["דִּבְרֵי","The words of"],["אֱלֹהִים","God,"],["אֲשֶׁר","which"],["דִּבֶּר","he spake"],["אֶל־מֹשֶׁה","unto Moses"],["בְּעֵת","at a time"],["אֲשֶׁר","when"],["הֶעֱלָהוּ","Moses was caught up"],["אֶל־הַר","into a mountain"],["גָּבֹהַּ","exceedingly"],["מְאֹד","high."],["׃",""]
  ]},
  { num: "ב", words: [
    ["וַיַּרְא","And he saw"],["אֶת־אֱלֹהִים","God"],["פָּנִים","face"],["אֶל־פָּנִים","to face,"],["וַיְדַבֵּר","and he talked"],["עִמּוֹ","with him,"],["וּכְבוֹד","and the glory of"],["אֱלֹהִים","God"],["הָיָה","was"],["עָלָיו","upon him;"],["וְעַל־כֵּן","therefore"],["יָכֹל","Moses could"],["לַעֲמֹד","endure"],["לְפָנָיו","his presence."],["׃",""]
  ]},
  { num: "ג", words: [
    ["וַיְדַבֵּר","And spake"],["אֱלֹהִים","God"],["אֶל־מֹשֶׁה","unto Moses,"],["לֵאמֹר","saying:"],["הִנֵּה","Behold,"],["אֲנִי","I am"],["יְהוָה","the Lord"],["אֵל","God"],["שַׁדַּי","Almighty,"],["וְלָעַד","and Endless"],["שְׁמִי","is my name;"],["כִּי","for"],["אֵין","I am without"],["לִי","to me"],["רֵאשִׁית","beginning of"],["יָמִים","days"],["וְאֵין","or"],["קֵץ","end of"],["שָׁנָי","years;"],["הֲלֹא","and is not"],["זֶה","this"],["נֶצַח","endless?"],["׃",""]
  ]},
  { num: "ד", words: [
    ["וְהִנֵּה","And behold,"],["אַתָּה","thou art"],["בְנִי","my son;"],["וְאַרְאֶךָ","wherefore I will show thee"],["מַעֲשֵׂה","the workmanship of"],["יָדָי","mine hands,"],["אַךְ","but"],["לֹא","not"],["אֶת־כֻּלּוֹ","all,"],["כִּי","for"],["אֵין","there is no"],["קֵץ","end"],["לְמַעֲשַׂי","to my works,"],["וְגַם","and also"],["לִדְבָרַי","my words,"],["כִּי","for"],["לֹא","never"],["יֶחְדָּלוּן","they cease."],["׃",""]
  ]},
  { num: "ה", words: [
    ["עַל־כֵּן","Wherefore,"],["לֹא","no"],["יוּכַל","can"],["אִישׁ","man"],["לִרְאוֹת","behold"],["אֶת־כׇּל־מַעֲשַׂי","all my works,"],["אִם־לֹא","except"],["יִרְאֶה","he behold"],["אֶת־כׇּל־כְּבוֹדִי","all my glory;"],["וְאִישׁ","and no man"],["בַּבָּשָׂר","in the flesh"],["לֹא","not"],["יִרְאֶנִּי","can behold me,"],["וָחָי","and live."],["׃",""]
  ]},
  { num: "ו", words: [
    ["וְיֵשׁ־לִי","And I have"],["מְלָאכָה","a work"],["בְּךָ","for thee,"],["מֹשֶׁה","Moses,"],["בְּנִי","my son;"],["וְאַתָּה","and thou art"],["בִּדְמוּת","in the similitude of"],["יְחִידִי","mine Only Begotten;"],["וִיחִידִי","and mine Only Begotten"],["הוּא","he"],["הַמּוֹשִׁיעַ","is and shall be the Savior,"],["מָלֵא","for he is full of"],["חֶסֶד","grace"],["וֶאֱמֶת","and truth;"],["אֵין","but there is no"],["אֱלֹהִים","God"],["זוּלָתִי","beside me,"],["וְכׇל־הַדְּבָרִים","and all things"],["לְפָנַי","are present with me,"],["כִּי","for"],["יְדַעְתִּים","I know them all."],["׃",""]
  ]},
  { num: "ז", words: [
    ["וְעַתָּה","And now,"],["דָּבָר","a thing"],["אֶחָד","one"],["אֶרְאֶךָּ","I will show thee,"],["מֹשֶׁה","Moses,"],["בְּנִי","my son,"],["כִּי","for"],["בָעוֹלָם","in the world"],["אַתָּה","thou art,"],["וְאֶרְאֶךָּ","and now I will show"],["אֹתוֹ","it unto thee."],["׃",""]
  ]},
  { num: "ח", words: [
    ["וַיַּבֵּט","And looked"],["מֹשֶׁה","Moses,"],["וַיַּרְא","and beheld"],["אֶת־הָעוֹלָם","the world"],["וְאֶת־קְצוֹתָיו","and the ends thereof,"],["וְאֵת","and"],["כׇּל־בְּנֵי","all the children of"],["הָאָדָם","men"],["אֲשֶׁר","which"],["הֵם","are,"],["וַאֲשֶׁר","and which"],["הָיוּ","were"],["וְגַם","also,"],["אֲשֶׁר","which"],["יִבָּרְאוּ","were created;"],["וַיִּתְמַהּ","and he greatly marvelled"],["וַיִּפְלָא","and wondered."],["׃",""]
  ]},
  { num: "ט", words: [
    ["וְנִסְתַּר","And was withdrawn"],["פְּנֵי","the presence of"],["אֱלֹהִים","God"],["מֵעָלָיו","from him,"],["וְלֹא","and not"],["הָיָה","was"],["כְבוֹדוֹ","his glory"],["עוֹד","any more"],["עָלָיו","upon him;"],["וַיִּשָּׁאֵר","and was left"],["מֹשֶׁה","Moses"],["לְבַדּוֹ","unto himself."],["וַיִּפֹּל","And he fell"],["אָרְצָה","unto the earth."],["׃",""]
  ]},
  { num: "י", words: [
    ["וַיְהִי","And it came to pass"],["שָׁעוֹת","that hours"],["רַבּוֹת","many"],["עַד","before"],["אֲשֶׁר","which"],["שָׁב","received"],["כֹּחוֹ","his natural strength"],["אֶל־הָאָדָם","again the man;"],["וַיֹּאמֶר","and he said"],["אֶל־נַפְשׁוֹ","unto himself:"],["עַתָּה","Now,"],["יָדַעְתִּי","I know"],["כִּי","that"],["הָאָדָם","man"],["אַיִן","is nothing,"],["וְלֹא","and not"],["יָדַעְתִּי","supposed I"],["כֵן","so"],["מִלְּפָנִים","never had."],["׃",""]
  ]},
  { num: "יא", words: [
    ["אַךְ","But"],["עַתָּה","now"],["רָאוּ","have beheld"],["עֵינַי","mine own eyes"],["אֱלֹהִים","God;"],["לֹא","not"],["עֵינַי","mine eyes"],["הַבָּשָׂר","natural,"],["כִּי","but"],["אִם","rather"],["עֵינַי","mine eyes"],["הָרוּחַ","spiritual;"],["כִּי","for"],["עֵינַי","mine eyes"],["הַבָּשָׂר","natural"],["לֹא","not"],["יָכְלוּ","could have"],["לִרְאוֹת","beheld;"],["כִּי","for"],["קָמַלְתִּי","I should have withered"],["וָמַתִּי","and died"],["לְפָנָיו","in his presence;"],["אַךְ","but"],["כְּבוֹדוֹ","his glory"],["הָיָה","was"],["עָלַי","upon me;"],["וָאֵרֶא","and I beheld"],["פָנָיו","his face,"],["כִּי","for"],["נִשְׁתַּנֵּיתִי","I was transfigured"],["לְפָנָיו","before him."],["׃",""]
  ]},
  { num: "יב", words: [
    ["וַיְהִי","And it came to pass"],["כַּאֲשֶׁר","that when"],["דִּבֶּר","Moses had said"],["אֶת־הַדְּבָרִים","the words"],["הָאֵלֶּה","these,"],["וְהִנֵּה","behold,"],["בָּא","came"],["הַשָּׂטָן","Satan"],["לְנַסֹּתוֹ","tempting him,"],["לֵאמֹר","saying:"],["מֹשֶׁה","Moses,"],["בֶּן־אָדָם","son of man,"],["הִשְׁתַּחֲוֵה","worship"],["לִי","me."],["׃",""]
  ]},
  { num: "יג", words: [
    ["וַיַּבֵּט","And looked"],["מֹשֶׁה","Moses"],["אֶל־הַשָּׂטָן","upon Satan,"],["וַיֹּאמֶר","and said:"],["מִי","Who"],["אַתָּה","art thou?"],["כִּי","For"],["הִנֵּה","behold,"],["אָנֹכִי","I am"],["בֶּן־אֱלֹהִים","a son of God,"],["בִּדְמוּת","in the similitude of"],["יְחִידוֹ","his Only Begotten;"],["וְאַיֵּה","and where is"],["כְבוֹדְךָ","thy glory,"],["כִּי","that"],["אֶשְׁתַּחֲוֶה","I should worship"],["לָּךְ","thee?"],["׃",""]
  ]},
  { num: "יד", words: [
    ["כִּי","For"],["לֹא","not"],["יָכֹלְתִּי","I could"],["לְהַבִּיט","look"],["אֶל־אֱלֹהִים","upon God,"],["בִּלְתִּי","except"],["כְבוֹדוֹ","his glory"],["עָלַי","came upon me,"],["וַאֲנִי","and I"],["נִשְׁתַּנֵּיתִי","were transfigured"],["לְפָנָיו","before him."],["אַךְ","But"],["אוּכַל","I can"],["לְהַבִּיט","look"],["אֵלֶיךָ","upon thee"],["כְּאִישׁ","as a man."],["׃",""],["הֲלֹא","Is it not"],["כֵן","so,"],["בַּבָּשָׂר","in the flesh"],["הַטִּבְעִי","natural?"],["׃",""]
  ]},
  { num: "טו", words: [
    ["בָּרוּךְ","Blessed be"],["הָשֵׁם","the name of"],["אֱלֹהָי","my God,"],["כִּי","for"],["רוּחוֹ","his Spirit"],["לֹא","not"],["סָרָה","hath departed"],["מִמֶּנִּי","from me."],["וְאַיֵּה","And where is"],["כְבוֹדְךָ","thy glory,"],["כִּי","for"],["חֹשֶׁךְ","darkness"],["הוּא","it is"],["לִי","unto me?"],["וְאוּכַל","And I can"],["לִשְׁפֹּט","judge"],["בֵּינְךָ","between thee"],["וּבֵין","and"],["אֱלֹהִים","God;"],["כִּי","for"],["אָמַר","said"],["אֵלַי","unto me"],["אֱלֹהִים","God:"],["הִשְׁתַּחֲוֵה","Worship"],["לֵאלֹהִים","God,"],["אֹתוֹ","him"],["לְבַדּוֹ","only"],["תַעֲבֹד","shalt thou serve."],["׃",""]
  ]},
  { num: "טז", words: [
    ["לֵךְ","Get thee"],["לְךָ","thyself"],["מִזֶּה","hence,"],["שָׂטָן","Satan;"],["אַל־תַּשִּׁיאֵנִי","deceive me not;"],["כִּי","for"],["אָמַר","said"],["אֱלֹהִים","God"],["אֵלַי","unto me:"],["אַתָּה","Thou art"],["בִּדְמוּת","after the similitude of"],["יְחִידִי","mine Only Begotten."],["׃",""]
  ]},
  { num: "יז", words: [
    ["וְגַם","And also"],["נָתַן","gave"],["אֱלֹהִים","God"],["לִי","unto me"],["מִצְוֹת","commandments,"],["בְּקׇרְאוֹ","when he called"],["אֵלַי","unto me"],["מִתּוֹךְ","out of"],["הַסְּנֶה","the bush,"],["הַבֹּעֵר","burning,"],["לֵאמֹר","saying:"],["קְרָא","Call"],["אֶל־אֱלֹהִים","upon God"],["בְּשֵׁם","in the name of"],["יְחִידוֹ","mine Only Begotten,"],["וְהִשְׁתַּחֲוֵה","and worship"],["לוֹ","him."],["׃",""]
  ]},
  { num: "יח", words: [
    ["וַיֹּאמֶר","And again Moses said:"],["עוֹד","further,"],["לֹא","not"],["אֶחְדַּל","I will cease"],["לִקְרֹא","to call"],["אֶל־אֱלֹהִים","upon God,"],["כִּי","for"],["דְּבָרִים","things"],["אֲחֵרִים","other"],["לִי","I have to"],["לִשְׁאֹל","inquire"],["אֹתוֹ","of him;"],["וּכְבוֹדוֹ","for his glory"],["הָיָה","has been"],["עָלַי","upon me,"],["וְעַל־כֵּן","wherefore"],["אוּכַל","I can"],["לִשְׁפֹּט","judge"],["בֵּינוֹ","between him"],["וּבֵינֶךָ","and thee."],["לֵךְ","Depart"],["לְךָ","thyself"],["מִזֶּה","hence,"],["שָׂטָן","Satan."],["׃",""]
  ]},
  { num: "יט", words: [
    ["וְכַאֲשֶׁר","And now when"],["דִּבֶּר","had said"],["מֹשֶׁה","Moses"],["אֶת־הַדְּבָרִים","the words"],["הָאֵלֶּה","these,"],["וַיִּצְעַק","cried"],["הַשָּׂטָן","Satan"],["בְּקוֹל","with a voice"],["גָּדוֹל","loud,"],["וַיִּרְעַם","and ranted"],["עַל־הָאָרֶץ","upon the earth,"],["וַיְצַו","and commanded,"],["לֵאמֹר","saying:"],["אֲנִי","I am"],["הַיָּחִיד","the Only Begotten,"],["הִשְׁתַּחֲווּ","worship"],["לִי","me."],["׃",""]
  ]},
  { num: "כ", words: [
    ["וַיָּחֶל","And began"],["מֹשֶׁה","Moses"],["לִירֹא","to fear"],["מְאֹד","exceedingly;"],["וַיַּרְא","and as he began to fear, he saw"],["אֶת־מְרֹרוֹת","the bitterness of"],["שְׁאוֹל","hell."],["אַךְ","Nevertheless,"],["קָרָא","calling"],["אֶל־אֱלֹהִים","upon God,"],["וַיְקַבֵּל","he received"],["כֹּחַ","strength,"],["וַיְצַו","and he commanded,"],["לֵאמֹר","saying:"],["סוּר","Depart"],["מֵעָלַי","from me,"],["שָׂטָן","Satan,"],["כִּי","for"],["לֵאלֹהִים","this one God"],["לְבַדּוֹ","only"],["אֶשְׁתַּחֲוֶה","will I worship,"],["אֱלֹהֵי","which is the God of"],["הַכָּבוֹד","glory."],["׃",""]
  ]},
  { num: "כא", words: [
    ["וַיָּחֶל","And began"],["הַשָּׂטָן","Satan"],["לֶחֱרֹד","to tremble,"],["וַתִּרְעַשׁ","and quaked"],["הָאָרֶץ","the earth;"],["וַיְקַבֵּל","and received"],["מֹשֶׁה","Moses"],["כֹּחַ","strength,"],["וַיִּקְרָא","and called"],["אֶל־אֱלֹהִים","upon God,"],["לֵאמֹר","saying:"],["בְּשֵׁם","In the name of"],["הַיָּחִיד","the Only Begotten,"],["סוּר","depart"],["מִזֶּה","hence,"],["שָׂטָן","Satan."],["׃",""]
  ]},
  { num: "כב", words: [
    ["וַיִּצְעַק","And cried"],["הַשָּׂטָן","Satan"],["בְּקוֹל","with a voice"],["גָּדוֹל","loud,"],["בִּבְכִי","with weeping,"],["וּמִסְפֵּד","and wailing,"],["וַחֲרֹק","and gnashing of"],["שִׁנָּיִם","teeth;"],["וַיֵּלֶךְ","and he departed"],["מִשָּׁם","from there,"],["וַיָּסַר","and turned aside"],["מֵעַל־מֹשֶׁה","from Moses,"],["וְלֹא","and not"],["רָאָהוּ","beheld he him"],["עוֹד","any more."],["׃",""]
  ]},
  { num: "כג", words: [
    ["וְאֶת־הַדָּבָר","And this thing"],["הַזֶּה","[this]"],["הֵעִיד","bare record"],["מֹשֶׁה","Moses;"],["אַךְ","but"],["מִפְּנֵי","because of"],["רִשְׁעָה","wickedness,"],["אֵינֶנּוּ","it is not"],["בְּסֵפֶר","in the book"],["הַזֶּה","this"],["אֲשֶׁר","which"],["תִּקְרְאוּ","ye shall read."],["׃",""]
  ]},
  { num: "כד", words: [
    ["וַיְהִי","And it came to pass"],["כַּאֲשֶׁר","that when"],["הָלַךְ","had departed"],["הַשָּׂטָן","Satan"],["מִמֹּשֶׁה","from Moses,"],["וַיִּשָּׂא","that lifted up"],["מֹשֶׁה","Moses"],["עֵינָיו","his eyes"],["הַשָּׁמַיְמָה","unto heaven,"],["מָלֵא","being filled with"],["רוּחַ","the Spirit of"],["אֱלֹהִים","God,"],["הַמֵּעִידָה","which beareth record of"],["עַל־הָאָב","the Father"],["וְעַל־הַבֵּן","and the Son."],["׃",""]
  ]},
  { num: "כה", words: [
    ["וַיִּקְרָא","And calling"],["בְשֵׁם","upon the name of"],["אֱלֹהִים","God,"],["וַיַּרְא","he beheld"],["כְּבוֹדוֹ","his glory"],["עוֹד","again,"],["כִּי","for"],["הָיָה","it was"],["עָלָיו","upon him;"],["וַיִּשְׁמַע","and he heard"],["קוֹל","a voice,"],["לֵאמֹר","saying:"],["בָּרוּךְ","Blessed art"],["אַתָּה","thou,"],["מֹשֶׁה","Moses,"],["כִּי","for"],["אֲנִי","I,"],["שַׁדַּי","the Almighty,"],["בָּחַרְתִּי","have chosen"],["בָךְ","thee,"],["וְתֶחֱזַק","and thou shalt be made stronger"],["מִמַּיִם","than waters"],["רַבִּים","many;"],["כִּי","for"],["יִשְׁמְעוּ","they shall obey"],["לְמִצְוֹתֶיךָ","thy command"],["כַּאֲשֶׁר","as"],["אַתָּה","thou wert"],["כֵּאלֹהִים","as God."],["׃",""]
  ]},
  { num: "כו", words: [
    ["וְהִנֵּה","And lo, behold,"],["אָנֹכִי","I am"],["עִמָּךְ","with thee,"],["עַד־קֵץ","even unto the end of"],["יָמֶיךָ","thy days;"],["כִּי","for"],["תוֹצִיא","thou shalt deliver"],["אֶת־עַמִּי","my people"],["מֵעֲבֹדָה","from bondage,"],["אֶת־יִשְׂרָאֵל","even Israel"],["בְּחִירִי","my chosen."],["׃",""]
  ]},
  { num: "כז", words: [
    ["וְהַקּוֹל","And as the voice"],["עוֹד","was still"],["מְדַבֵּר","speaking,"],["וַיִּשָּׂא","cast"],["מֹשֶׁה","Moses"],["עֵינָיו","his eyes,"],["וַיַּרְא","and beheld"],["אֶת־הָאָרֶץ","the earth,"],["כֻּלָּהּ","yea, all of it;"],["וְאֵין","and there was not"],["חֶלְקָה","a particle of it"],["מִמֶּנָּה","thereof"],["אֲשֶׁר","which"],["לֹא","not"],["רָאָהּ","he did behold,"],["וַיַּכִּירָהּ","discerning it"],["בְּרוּחַ","by the Spirit of"],["אֱלֹהִים","God."],["׃",""]
  ]},
  { num: "כח", words: [
    ["וַיַּרְא","And he beheld"],["גַּם","also"],["אֶת־יֹשְׁבֶיהָ","the inhabitants thereof,"],["וְלֹא","and there was not"],["הָיְתָה","there was"],["נֶפֶשׁ","a soul"],["אֲשֶׁר","which"],["לֹא","not"],["רָאָהּ","he beheld;"],["וַיַּכִּירֵם","and he discerned them"],["בְּרוּחַ","by the Spirit of"],["אֱלֹהִים","God;"],["וּמִסְפָּרָם","and their numbers were"],["רַב","great,"],["כְּחוֹל","even as the sand"],["אֲשֶׁר","which is"],["עַל־שְׂפַת","upon the shore of"],["הַיָּם","the sea."],["׃",""]
  ]},
  { num: "כט", words: [
    ["וַיַּרְא","And he beheld"],["אֲרָצוֹת","lands"],["רַבּוֹת","many;"],["וְכׇל־אֶרֶץ","and every land"],["קָרְאָה","was called"],["בְּשֵׁם","by the name of"],["יֹשְׁבֶיהָ","its inhabitants;"],["וְהָיוּ","and they were"],["יֹשְׁבִים","inhabitants"],["עַל־פָּנֶיהָ","upon the face thereof."],["׃",""]
  ]},
  { num: "ל", words: [
    ["וַיִּקְרָא","And called"],["מֹשֶׁה","Moses"],["אֶל־אֱלֹהִים","upon God,"],["לֵאמֹר","saying:"],["הַגֶּד־נָא","Tell me, I pray thee,"],["לִי","unto me"],["מַדּוּעַ","why"],["הַדְּבָרִים","things"],["הָאֵלֶּה","these"],["כֵן","are so,"],["וּבַמָּה","and by what"],["עָשִׂיתָ","thou madest"],["אֹתָם","them?"],["׃",""]
  ]},
  { num: "לא", words: [
    ["וּכְבוֹד","And the glory of"],["יְהוָה","the Lord"],["הָיָה","was"],["עַל־מֹשֶׁה","upon Moses,"],["וַיַּעֲמֹד","so that he stood"],["לִפְנֵי","in the presence of"],["אֱלֹהִים","God,"],["וַיְדַבֵּר","and talked"],["עִמּוֹ","with him"],["פָּנִים","face"],["אֶל־פָּנִים","to face."],["וַיֹּאמֶר","And said"],["יְהוָה","the Lord"],["אֶל־מֹשֶׁה","unto Moses:"],["לְמַעֲנִי","For mine own purpose"],["עָשִׂיתִי","have I made"],["אֶת־הַדְּבָרִים","things"],["הָאֵלֶּה","these."],["וְהִנֵּה","Here is"],["חׇכְמָתִי","my wisdom,"],["נִצְּבָה","and it remaineth in me."],["׃",""]
  ]},
  { num: "לב", words: [
    ["וּבִדְבַר","And by the word of"],["כֹּחִי","my power,"],["בָּרָאתִים","have I created them,"],["אֲשֶׁר","which is"],["הוּא","he,"],["בְּנִי","mine Only Begotten"],["יְחִידִי","Son,"],["הַמָּלֵא","who is full of"],["חֶסֶד","grace"],["וֶאֱמֶת","and truth."],["׃",""]
  ]},
  { num: "לג", words: [
    ["אֲרָצוֹת","Worlds"],["אֵין","without"],["מִסְפָּר","number"],["בָּרָאתִי","have I created;"],["לְמַעֲנִי","and for mine own purpose"],["וּבַבֵּן","and by the Son,"],["בָּרָאתִים","I created them,"],["אֲשֶׁר","which is"],["הוּא","he,"],["יְחִידִי","mine Only Begotten."],["׃",""]
  ]},
  { num: "לד", words: [
    ["וְהָאָדָם","And the man"],["הָרִאשׁוֹן","first"],["קָרָאתִי","I have called"],["שְׁמוֹ","by name"],["אָדָם","Adam,"],["אֲשֶׁר","which is"],["הוּא","that one of"],["רַבִּים","many."],["׃",""]
  ]},
  { num: "לה", words: [
    ["אַךְ","But"],["רַק","only"],["חֶשְׁבּוֹן","an account of"],["הָאָרֶץ","earth"],["הַזֹּאת","this,"],["וְיֹשְׁבֶיהָ","and the inhabitants thereof,"],["נֹתֵן","give I"],["אֲנִי","I"],["לָךְ","unto you."],["כִּי","For"],["אֲרָצוֹת","worlds"],["רַבּוֹת","many"],["עָבְרוּ","have passed away"],["בִּדְבַר","by the word of"],["כֹּחִי","my power."],["וְרַבּוֹת","And there are many that"],["עֹמְדוֹת","now stand,"],["עַתָּה","now,"],["וְאֵין","and not"],["מִסְפָּר","numbered"],["לָהֶן","unto"],["לָאָדָם","man;"],["אַךְ","but"],["כֻּלָּן","all things"],["סְפוּרוֹת","are numbered"],["לִי","unto me,"],["כִּי","for"],["לִי","unto me"],["הֵן","they are mine"],["וִידַעְתִּין","and I know them."],["׃",""]
  ]},
  { num: "לו", words: [
    ["וַיְדַבֵּר","And spake"],["מֹשֶׁה","Moses"],["אֶל־יְהוָה","unto the Lord,"],["לֵאמֹר","saying:"],["חׇנֵּנִי","Be merciful unto me,"],["וְהַגֵּד","and tell"],["לְעַבְדְּךָ","thy servant"],["עַל־הָאָרֶץ","concerning earth"],["הַזֹּאת","this,"],["וְעַל־יֹשְׁבֶיהָ","and the inhabitants thereof,"],["וְעַל־הַשָּׁמַיִם","and also the heavens,"],["וְיִשְׂבַּע","and then shall be satisfied"],["עַבְדֶּךָ","thy servant."],["׃",""]
  ]},
  { num: "לז", words: [
    ["וַיְדַבֵּר","And spake"],["יְהוָה","the Lord"],["אֱלֹהִים","God"],["אֶל־מֹשֶׁה","unto Moses,"],["לֵאמֹר","saying:"],["הַשָּׁמַיִם","The heavens,"],["רַבִּים","many"],["הֵם","they are,"],["וְאֵין","and they cannot be"],["מִסְפָּר","numbered"],["לָהֶם","to them"],["לָאָדָם","unto man;"],["אַךְ","but"],["סְפוּרִים","numbered"],["הֵם","they are"],["לִי","unto me,"],["כִּי","for"],["לִי","mine"],["הֵם","they are."],["׃",""]
  ]},
  { num: "לח", words: [
    ["וְכַאֲשֶׁר","And as"],["תַעֲבֹר","shall pass away"],["אֶרֶץ","earth"],["אַחַת","one,"],["וּשְׁמֵיהֶם","and the heavens thereof,"],["כֵּן","even so"],["תָּבֹא","shall come"],["אַחֶרֶת","another;"],["וְאֵין","and there is no"],["קֵץ","end"],["לְמַעֲשַׂי","to my works,"],["וְלֹא","neither"],["לִדְבָרָי","to my words."],["׃",""]
  ]},
  { num: "לט", words: [
    ["כִּי","For"],["זֶה","this"],["מַעֲשִׂי","is my work"],["וּכְבוֹדִי","and my glory—"],["לְהָבִיא","to bring to pass"],["חַיֵּי","the life"],["עוֹלָם","eternal"],["וּמָוֶת","and immortality"],["בִּלְתִּי־מָוֶת","without death"],["לָאָדָם","of man."],["׃",""]
  ]},
  { num: "מ", words: [
    ["וְעַתָּה","And now,"],["מֹשֶׁה","Moses,"],["בְּנִי","my son,"],["אֲדַבֵּר","I will speak"],["אֵלֶיךָ","unto thee"],["עַל־הָאָרֶץ","concerning earth"],["הַזֹּאת","this"],["אֲשֶׁר","upon which"],["אַתָּה","thou"],["עֹמֵד","standest;"],["עָלֶיהָ","upon it"],["וְתִכְתֹּב","and thou shalt write"],["אֶת־הַדְּבָרִים","the words"],["אֲשֶׁר","which"],["אֲדַבֵּר","I shall speak."],["׃",""]
  ]},
  { num: "מא", words: [
    ["וּבְיוֹם","And in a day"],["אֲשֶׁר","when"],["יַחְשְׁבוּ","shall esteem"],["בְנֵי","the children of"],["אָדָם","men"],["אֶת־דְּבָרַי","my words"],["לְאָיִן","as naught"],["וְיָסִירוּ","and take"],["רַבִּים","many of them"],["מֵהַסֵּפֶר","out of the book"],["אֲשֶׁר","which"],["תִּכְתֹּב","thou shalt write,"],["אָקִים","I will raise up"],["אַחֵר","another"],["כָּמוֹךָ","like unto thee;"],["וְיִהְיוּ","and they shall be had again"],["עוֹד","once more"],["בְּתוֹךְ","among"],["בְּנֵי","the children of"],["עַמִּי","men—among"],["הַמַּאֲמִינִים","as many as shall believe."],["׃",""]
  ]},
  { num: "מב", words: [
    ["וְהַדְּבָרִים","And things"],["הָאֵלֶּה","these"],["נֶאֶמְרוּ","were spoken"],["אֶל־מֹשֶׁה","unto Moses"],["בָּהָר","in the mount,"],["אֲשֶׁר","whose"],["לֹא","not"],["יִוָּדַע","the name of it"],["שְׁמוֹ","shall be known"],["בְּתוֹךְ","among"],["בְּנֵי","the children of"],["הָאָדָם","men."],["וְעַתָּה","And now"],["נֶאֶמְרוּ","they are spoken"],["אֵלֶיךָ","unto thee."],["אַל־תַּרְאֵם","Show them not"],["לְאִישׁ","unto any"],["בִּלְתִּי","except"],["לַמַּאֲמִינִים","them that believe."],["אָמֵן","Amen."],["׃",""]
  ]}
];
renderVerseSet(ms_ch1Verses, 'ms-ch1-verses');
var ms_ch2Verses = [
  { num: "א", words: [
    ["וַיְהִי","And it came to pass"],["כִּי","that"],["דִּבֶּר","spake"],["יְהוָה","the Lord"],["אֶל־מֹשֶׁה","unto Moses,"],["לֵאמֹר","saying:"],["הִנֵּה","Behold,"],["אֲנִי","I"],["מְגַלֶּה","reveal"],["לְךָ","unto thee"],["עַל־הַשָּׁמַיִם","concerning heavens"],["הָאֵלֶּה","these,"],["וְעַל־הָאָרֶץ","and earth"],["הַזֹּאת","this;"],["כְּתֹב","write"],["אֶת־הַדְּבָרִים","the words"],["אֲשֶׁר","which"],["אֲדַבֵּר","I speak"],["אֵלֶיךָ","unto thee."],["׃",""],["אֲנִי","I am"],["הָרִאשׁוֹן","the Beginning"],["וַאֲנִי","and I am"],["הָאַחֲרוֹן","the End,"],["אֵל","God"],["שַׁדַּי","Almighty;"],["׃",""],["בִּבְנִי","by mine Only Begotten"],["יְחִידִי","Son"],["בָּרָאתִי","I created"],["אֶת־אֵלֶּה","these things;"],["אֵת","yea,"],["הַשָּׁמַיִם","the heavens"],["וּבְרֵאשִׁית","in the beginning"],["בָּרָאתִי","I created"],["אֶת־הַשָּׁמַיִם","the heaven"],["וְאֶת־הָאָרֶץ","and the earth"],["אֲשֶׁר","upon which"],["אַתָּה","thou"],["עֹמֵד","standest."],["עָלֶיהָ","upon it"],["׃",""]
  ]},
  { num: "ב", words: [
    ["וְהָאָרֶץ","And the earth"],["הָיְתָה","was"],["תֹהוּ","without form,"],["וָבֹהוּ","and void;"],["וַאֲנִי","and I,"],["אֱלֹהִים","God,"],["הֵבֵאתִי","caused"],["חֹשֶׁךְ","darkness"],["עַל־פְּנֵי","to come up upon the face of"],["תְהוֹם","the deep;"],["וְרוּחִי","and my Spirit"],["מְרַחֶפֶת","moved"],["עַל־פְּנֵי","upon the face of"],["הַמָּיִם","the water."],["׃",""]
  ]},
  { num: "ג", words: [
    ["וָאֹמַר","And I,"],["אֲנִי","I,"],["אֱלֹהִים","God,"],["יְהִי","said: Let there be"],["אוֹר","light;"],["וַיְהִי־אוֹר","and there was light."],["׃",""]
  ]},
  { num: "ד", words: [
    ["וָאֵרֶא","And I,"],["אֲנִי","I,"],["אֱלֹהִים","God,"],["אֶת־הָאוֹר","saw the light;"],["כִּי־טוֹב","and that light was good."],["וַאֲנִי","And I,"],["אֱלֹהִים","God,"],["הִבְדַּלְתִּי","divided"],["בֵּין","between"],["הָאוֹר","the light"],["וּבֵין","from"],["הַחֹשֶׁךְ","the darkness."],["׃",""]
  ]},
  { num: "ה", words: [
    ["וַאֲנִי","And I,"],["אֱלֹהִים","God,"],["קָרָאתִי","called"],["לָאוֹר","the light"],["יוֹם","Day;"],["וְלַחֹשֶׁךְ","and the darkness"],["קָרָאתִי","I called"],["לָיְלָה","Night;"],["וְזֹאת","and this"],["עָשִׂיתִי","I did"],["בִּדְבַר","by the word of"],["כֹּחִי","my power,"],["וַיְהִי־כֵן","and it was done"],["כַּאֲשֶׁר","as"],["דִּבַּרְתִּי","I spake;"],["וַיְהִי־עֶרֶב","and the evening"],["וַיְהִי־בֹקֶר","and the morning were"],["יוֹם","day"],["אֶחָד","the first."],["׃",""]
  ]},
  { num: "ו", words: [
    ["וָאֹמַר","And again, I,"],["אֲנִי","I,"],["אֱלֹהִים","God,"],["יְהִי","said: Let there be"],["רָקִיעַ","a firmament"],["בְּתוֹךְ","in the midst of"],["הַמָּיִם","the waters,"],["וַיְהִי־כֵן","and it was so;"],["וָאֹמַר","and I,"],["אֲנִי","I,"],["אֱלֹהִים","God,"],["יַבְדֵּל","said: Let it divide"],["בֵּין","between"],["מַיִם","the waters"],["לָמָיִם","from the waters;"],["וַיְהִי־כֵן","and it was so."],["׃",""]
  ]},
  { num: "ז", words: [
    ["וַאֲנִי","And I,"],["אֱלֹהִים","God,"],["עָשִׂיתִי","made"],["אֶת־הָרָקִיעַ","the firmament,"],["וַאֲנִי","and I,"],["אֱלֹהִים","God,"],["הִבְדַּלְתִּי","divided"],["בֵּין","between"],["הַמַּיִם","the waters"],["אֲשֶׁר","which were"],["מִתַּחַת","under"],["לָרָקִיעַ","the firmament"],["וּבֵין","from"],["הַמַּיִם","the waters"],["אֲשֶׁר","which were"],["מֵעַל","above"],["לָרָקִיעַ","the firmament,"],["וַיְהִי־כֵן","and it was so"],["כַּאֲשֶׁר","even as"],["דִּבַּרְתִּי","I spake."],["׃",""]
  ]},
  { num: "ח", words: [
    ["וַאֲנִי","And I,"],["אֱלֹהִים","God,"],["קָרָאתִי","called"],["לָרָקִיעַ","the firmament"],["שָׁמָיִם","Heaven;"],["וַיְהִי־עֶרֶב","and the evening"],["וַיְהִי־בֹקֶר","and the morning were"],["יוֹם","day"],["שֵׁנִי","the second."],["׃",""]
  ]},
  { num: "ט", words: [
    ["וָאֹמַר","And I,"],["אֲנִי","I,"],["אֱלֹהִים","God,"],["יִקָּווּ","said: Let be gathered"],["הַמַּיִם","the waters"],["מִתַּחַת","under"],["הַשָּׁמַיִם","the heaven"],["אֶל־מָקוֹם","be gathered together unto place"],["אֶחָד","one,"],["וַיְהִי־כֵן","and it was so;"],["וָאֹמַר","and I,"],["אֲנִי","I,"],["אֱלֹהִים","God,"],["תֵּרָאֶה","said: Let appear"],["הַיַּבָּשָׁה","the dry land,"],["וַיְהִי־כֵן","and it was so."],["׃",""]
  ]},
  { num: "י", words: [
    ["וַאֲנִי","And I,"],["אֱלֹהִים","God,"],["קָרָאתִי","called"],["לַיַּבָּשָׁה","the dry land"],["אֶרֶץ","Earth;"],["וּלְמִקְוֵה","and the gathering together of"],["הַמַּיִם","the waters,"],["קָרָאתִי","called I"],["יַמִּים","the Sea;"],["וַאֲנִי","and I,"],["אֱלֹהִים","God,"],["רָאִיתִי","saw"],["כִּי־טוֹב","that all things were good."],["׃",""]
  ]},
  { num: "יא", words: [
    ["וָאֹמַר","And I,"],["אֲנִי","I,"],["אֱלֹהִים","God,"],["תַּדְשֵׁא","said: Let bring forth"],["הָאָרֶץ","the earth"],["דֶּשֶׁא","grass,"],["עֵשֶׂב","the herb"],["מַזְרִיעַ","yielding"],["זֶרַע","seed,"],["עֵץ","the tree"],["פְּרִי","of fruit,"],["עֹשֶׂה","yielding"],["פְּרִי","fruit"],["לְמִינוֹ","after his kind,"],["אֲשֶׁר","whose"],["זַרְעוֹ־בוֹ","seed is in itself"],["עַל־הָאָרֶץ","upon the earth,"],["וַיְהִי־כֵן","and it was so"],["כַּאֲשֶׁר","even as"],["דִּבַּרְתִּי","I spake."],["׃",""]
  ]},
  { num: "יב", words: [
    ["וַתּוֹצֵא","And brought forth"],["הָאָרֶץ","the earth"],["דֶּשֶׁא","grass,"],["עֵשֶׂב","the herb"],["מַזְרִיעַ","yielding"],["זֶרַע","seed"],["לְמִינֵהוּ","after his kind,"],["וְעֵץ","and the tree"],["עֹשֶׂה־פְּרִי","yielding fruit,"],["אֲשֶׁר","whose"],["זַרְעוֹ־בוֹ","seed should be in itself,"],["לְמִינֵהוּ","after his kind;"],["וַאֲנִי","and I,"],["אֱלֹהִים","God,"],["רָאִיתִי","saw"],["כִּי־טוֹב","that all things were good."],["׃",""]
  ]},
  { num: "יג", words: [
    ["וַיְהִי־עֶרֶב","And the evening"],["וַיְהִי־בֹקֶר","and the morning were"],["יוֹם","day"],["שְׁלִישִׁי","the third."],["׃",""]
  ]},
  { num: "יד", words: [
    ["וָאֹמַר","And I,"],["אֲנִי","I,"],["אֱלֹהִים","God,"],["יְהִי","said: Let there be"],["מְאֹרֹת","lights"],["בִּרְקִיעַ","in the firmament of"],["הַשָּׁמַיִם","the heaven,"],["לְהַבְדִּיל","to divide"],["בֵּין","between"],["הַיּוֹם","the day"],["וּבֵין","from"],["הַלָּיְלָה","the night;"],["וְיִהְיוּ","and let them be"],["לְאֹתֹת","for signs,"],["וּלְמוֹעֲדִים","and for seasons,"],["וּלְיָמִים","and for days,"],["וְשָׁנִים","and for years;"],["׃",""]
  ]},
  { num: "טו", words: [
    ["וְיִהְיוּ","And let them be"],["לִמְאוֹרֹת","for lights"],["בִּרְקִיעַ","in the firmament of"],["הַשָּׁמַיִם","the heaven"],["לְהָאִיר","to give light"],["עַל־הָאָרֶץ","upon the earth;"],["וַיְהִי־כֵן","and it was so."],["׃",""]
  ]},
  { num: "טז", words: [
    ["וַאֲנִי","And I,"],["אֱלֹהִים","God,"],["עָשִׂיתִי","made"],["אֶת־שְׁנֵי","two"],["הַמְּאֹרֹת","lights"],["הַגְּדֹלִים","great;"],["אֶת־הַמָּאוֹר","the light"],["הַגָּדֹל","greater"],["לְמֶמְשֶׁלֶת","to rule"],["הַיּוֹם","the day,"],["וְאֶת־הַמָּאוֹר","and the light"],["הַקָּטֹן","lesser"],["לְמֶמְשֶׁלֶת","to rule"],["הַלַּיְלָה","the night,"],["הַגָּדֹל","the greater"],["הוּא","it is"],["הַשֶּׁמֶשׁ","the sun,"],["וְהַקָּטֹן","and the lesser"],["הוּא","it is"],["הַיָּרֵחַ","the moon;"],["וְגַם","and"],["אֶת־הַכּוֹכָבִים","the stars"],["עָשִׂיתִי","also I made"],["כַּאֲשֶׁר","even as"],["דִּבַּרְתִּי","I spake."],["׃",""]
  ]},
  { num: "יז", words: [
    ["וַאֲנִי","And I,"],["אֱלֹהִים","God,"],["נָתַתִּי","set"],["אֹתָם","them"],["בִּרְקִיעַ","in the firmament of"],["הַשָּׁמַיִם","the heaven"],["לְהָאִיר","to give light"],["עַל־הָאָרֶץ","upon the earth,"],["׃",""]
  ]},
  { num: "יח", words: [
    ["וּלְמֹשֵׁל","And to rule"],["בַּיּוֹם","over the day"],["וּבַלַּיְלָה","and over the night,"],["וּלְהַבְדִּיל","and to divide"],["בֵּין","between"],["הָאוֹר","the light"],["וּבֵין","from"],["הַחֹשֶׁךְ","the darkness;"],["וַאֲנִי","and I,"],["אֱלֹהִים","God,"],["רָאִיתִי","saw"],["כִּי־טוֹב","that all things which I had made were good."],["׃",""]
  ]},
  { num: "יט", words: [
    ["וַיְהִי־עֶרֶב","And the evening"],["וַיְהִי־בֹקֶר","and the morning were"],["יוֹם","day"],["רְבִיעִי","the fourth."],["׃",""]
  ]},
  { num: "כ", words: [
    ["וָאֹמַר","And I,"],["אֲנִי","I,"],["אֱלֹהִים","God,"],["יִשְׁרְצוּ","said: Let bring forth"],["הַמַּיִם","the waters"],["שֶׁרֶץ","abundantly"],["נֶפֶשׁ","the creature"],["חַיָּה","living,"],["וְעוֹף","and fowl"],["יְעוֹפֵף","which may fly"],["עַל־הָאָרֶץ","above the earth"],["עַל־פְּנֵי","in the open"],["רְקִיעַ","firmament of"],["הַשָּׁמָיִם","the heaven."],["׃",""]
  ]},
  { num: "כא", words: [
    ["וַאֲנִי","And I,"],["אֱלֹהִים","God,"],["בָּרָאתִי","created"],["אֶת־הַתַּנִּינִם","whales"],["הַגְּדֹלִים","great,"],["וְאֵת","and"],["כׇּל־נֶפֶשׁ","every creature"],["הַחַיָּה","living"],["הָרֹמֶשֶׂת","that moveth,"],["אֲשֶׁר","which"],["שָׁרְצוּ","brought forth abundantly"],["הַמַּיִם","the waters,"],["לְמִינֵהֶם","after their kind,"],["וְאֵת","and"],["כׇּל־עוֹף","every fowl"],["כָּנָף","winged"],["לְמִינֵהוּ","after his kind;"],["וַאֲנִי","and I,"],["אֱלֹהִים","God,"],["רָאִיתִי","saw"],["כִּי־טוֹב","that all things which I had created were good."],["׃",""]
  ]},
  { num: "כב", words: [
    ["וַאֲנִי","And I,"],["אֱלֹהִים","God,"],["בֵּרַכְתִּי","blessed"],["אֹתָם","them,"],["לֵאמֹר","saying:"],["פְּרוּ","Be fruitful,"],["וּרְבוּ","and multiply,"],["וּמִלְאוּ","and fill"],["אֶת־הַמַּיִם","the waters"],["בַּיַּמִּים","in the seas;"],["וְהָעוֹף","and let fowl"],["יִרֶב","multiply"],["בָּאָרֶץ","in the earth."],["׃",""]
  ]},
  { num: "כג", words: [
    ["וַיְהִי־עֶרֶב","And the evening"],["וַיְהִי־בֹקֶר","and the morning were"],["יוֹם","day"],["חֲמִישִׁי","the fifth."],["׃",""]
  ]},
  { num: "כד", words: [
    ["וָאֹמַר","And I,"],["אֲנִי","I,"],["אֱלֹהִים","God,"],["תּוֹצֵא","said: Let bring forth"],["הָאָרֶץ","the earth"],["נֶפֶשׁ","the creature"],["חַיָּה","living"],["לְמִינָהּ","after his kind,"],["בְּהֵמָה","cattle,"],["וָרֶמֶשׂ","and creeping things,"],["וְחַיְתוֹ־אֶרֶץ","and beasts of the earth"],["לְמִינָהּ","after their kind,"],["וַיְהִי־כֵן","and it was so."],["׃",""]
  ]},
  { num: "כה", words: [
    ["וַאֲנִי","And I,"],["אֱלֹהִים","God,"],["עָשִׂיתִי","made"],["אֶת־חַיַּת","the beasts of"],["הָאָרֶץ","the earth"],["לְמִינָהּ","after their kind,"],["וְאֶת־הַבְּהֵמָה","and cattle"],["לְמִינָהּ","after their kind,"],["וְאֵת","and"],["כׇּל־רֶמֶשׂ","everything which creepeth upon"],["הָאֲדָמָה","the earth"],["לְמִינֵהוּ","after his kind;"],["וַאֲנִי","and I,"],["אֱלֹהִים","God,"],["רָאִיתִי","saw"],["כִּי־טוֹב","that all these things were good."],["׃",""]
  ]},
  { num: "כו", words: [
    ["וָאֹמַר","And I,"],["אֲנִי","I,"],["אֱלֹהִים","God,"],["אֶל־בְּנִי","said unto mine Only Begotten,"],["יְחִידִי","Son"],["אֲשֶׁר","which"],["הָיָה","was"],["עִמִּי","with me"],["מֵרֵאשִׁית","from the beginning:"],["נַעֲשֶׂה","Let us make"],["אָדָם","man"],["בְּצַלְמֵנוּ","in our image,"],["כִּדְמוּתֵנוּ","after our likeness;"],["וַיְהִי־כֵן","and it was so."],["וָאֹמַר","And I,"],["אֲנִי","I,"],["אֱלֹהִים","God,"],["וְיִרְדּוּ","said: Let them have dominion"],["בִדְגַת","over the fish of"],["הַיָּם","the sea,"],["וּבְעוֹף","and over the fowl of"],["הַשָּׁמַיִם","the air,"],["וּבַבְּהֵמָה","and over the cattle,"],["וּבְכׇל־הָאָרֶץ","and over all the earth,"],["וּבְכׇל־הָרֶמֶשׂ","and over every creeping thing"],["הָרֹמֵשׂ","that creepeth"],["עַל־הָאָרֶץ","upon the earth."],["׃",""]
  ]},
  { num: "כז", words: [
    ["וָאֶבְרָא","And I,"],["אֲנִי","I,"],["אֱלֹהִים","God,"],["אֶת־הָאָדָם","created man"],["בְּצַלְמִי","in mine own image,"],["בְּצֶלֶם","in the image of"],["בְּנִי","mine Only Begotten"],["יְחִידִי","Son"],["בָּרָאתִי","created I"],["אֹתוֹ","him;"],["זָכָר","male"],["וּנְקֵבָה","and female"],["בָּרָאתִי","created I"],["אֹתָם","them."],["׃",""]
  ]},
  { num: "כח", words: [
    ["וַאֲנִי","And I,"],["אֱלֹהִים","God,"],["בֵּרַכְתִּי","blessed"],["אֹתָם","them,"],["וָאֹמַר","and said"],["אֲנִי","I,"],["אֱלֹהִים","God,"],["לָהֶם","unto them:"],["פְּרוּ","Be fruitful,"],["וּרְבוּ","and multiply,"],["וּמִלְאוּ","and replenish"],["אֶת־הָאָרֶץ","the earth,"],["וְכִבְשֻׁהָ","and subdue it,"],["וּרְדוּ","and have dominion"],["בִּדְגַת","over the fish of"],["הַיָּם","the sea,"],["וּבְעוֹף","and over the fowl of"],["הַשָּׁמַיִם","the air,"],["וּבְכׇל־חַיָּה","and over every living thing"],["הָרֹמֶשֶׂת","that moveth"],["עַל־הָאָרֶץ","upon the earth."],["׃",""]
  ]},
  { num: "כט", words: [
    ["וָאֹמַר","And I,"],["אֲנִי","I,"],["אֱלֹהִים","God,"],["הִנֵּה","Behold,"],["נָתַתִּי","I have given"],["לָכֶם","you"],["אֶת־כׇּל־עֵשֶׂב","every herb"],["זֹרֵעַ","bearing"],["זֶרַע","seed"],["אֲשֶׁר","which is"],["עַל־פְּנֵי","upon the face of"],["כׇל־הָאָרֶץ","all the earth,"],["וְאֶת־כׇּל־הָעֵץ","and every tree"],["אֲשֶׁר־בּוֹ","in the which"],["פְרִי־עֵץ","shall be the fruit of a tree"],["זֹרֵעַ","yielding"],["זָרַע","seed;"],["לָכֶם","to you"],["יִהְיֶה","it shall be"],["לְאָכְלָה","for meat."],["׃",""]
  ]},
  { num: "ל", words: [
    ["וּלְכׇל־חַיַּת","And to every beast of"],["הָאָרֶץ","the earth,"],["וּלְכׇל־עוֹף","and to every fowl of"],["הַשָּׁמַיִם","the air,"],["וּלְכֹל","and to every thing"],["רוֹמֵשׂ","that creepeth"],["עַל־הָאָרֶץ","upon the earth,"],["אֲשֶׁר־בּוֹ","wherein"],["נֶפֶשׁ","I,"],["חַיָּה","God, have given life,"],["אֶת־כׇּל־יֶרֶק","every clean"],["עֵשֶׂב","herb"],["לְאָכְלָה","for meat;"],["וַיְהִי־כֵן","and it was so"],["כַּאֲשֶׁר","even as"],["דִּבַּרְתִּי","I spake."],["׃",""]
  ]},
  { num: "לא", words: [
    ["וָאֵרֶא","And I,"],["אֲנִי","I,"],["אֱלֹהִים","God,"],["אֶת־כׇּל־אֲשֶׁר","saw every thing that"],["עָשִׂיתִי","I had made,"],["וְהִנֵּה","and behold,"],["טוֹב","good"],["מְאֹד","all things were very;"],["וַיְהִי־עֶרֶב","and the evening"],["וַיְהִי־בֹקֶר","and the morning were"],["יוֹם","day"],["הַשִּׁשִּׁי","the sixth."],["׃",""]
  ]}
];
renderVerseSet(ms_ch2Verses, 'ms-ch2-verses');
var ms_ch3Verses = [
  { num: "א", words: [
    ["וַיְכֻלּוּ","Thus were finished"],["הַשָּׁמַיִם","the heavens"],["וְהָאָרֶץ","and the earth,"],["וְכׇל־צְבָאָם","and all the host of them."],["׃",""]
  ]},
  { num: "ב", words: [
    ["וַאֲנִי","And I,"],["אֱלֹהִים","God,"],["כִּלֵּיתִי","ended"],["בַּיּוֹם","by the day"],["הַשְּׁבִיעִי","the seventh"],["מְלַאכְתִּי","my work,"],["אֲשֶׁר","which"],["עָשִׂיתִי","I had made;"],["וָאֶשְׁבֹּת","and I rested"],["בַּיּוֹם","on the day"],["הַשְּׁבִיעִי","the seventh"],["מִכׇּל־מְלַאכְתִּי","from all my work,"],["אֲשֶׁר","which"],["עָשִׂיתִי","I had made;"],["וַאֲנִי","and I,"],["אֱלֹהִים","God,"],["רָאִיתִי","saw"],["כֹּל","every thing"],["אֲשֶׁר","that"],["עָשִׂיתִי","I had made,"],["כִּי־טוֹב","and behold, all things which I had made were"],["מְאֹד","very good."],["׃",""]
  ]},
  { num: "ג", words: [
    ["וַאֲנִי","And I,"],["אֱלֹהִים","God,"],["בֵּרַכְתִּי","blessed"],["אֶת־יוֹם","day"],["הַשְּׁבִיעִי","the seventh,"],["וַאֲקַדֵּשׁ","and sanctified"],["אֹתוֹ","it;"],["כִּי","because"],["בוֹ","that in it"],["שָׁבַתִּי","I had rested"],["מִכׇּל־מְלַאכְתִּי","from all my work"],["אֲשֶׁר","which"],["בָּרָאתִי","I,"],["וְעָשִׂיתִי","God, had created and made."],["׃",""]
  ]},
  { num: "ד", words: [
    ["וְאֵלֶּה","And now, behold, I say unto you, that these are"],["תוֹלְדוֹת","the generations of"],["הַשָּׁמַיִם","the heaven"],["וְהָאָרֶץ","and of the earth,"],["בְּהִבָּרְאָם","when they were created,"],["בְּיוֹם","in the day that"],["עֲשׂוֹת","made"],["יְהוָה","the Lord"],["אֱלֹהִים","God"],["אֶת־הַשָּׁמַיִם","the heavens"],["וְאֶת־הָאָרֶץ","and the earth,"],["׃",""]
  ]},
  { num: "ה", words: [
    ["וְכֹל","And every"],["שִׂיחַ","plant of"],["הַשָּׂדֶה","the field"],["טֶרֶם","before"],["יִהְיֶה","it was"],["בָאָרֶץ","in the earth,"],["וְכׇל־עֵשֶׂב","and every herb of"],["הַשָּׂדֶה","the field"],["טֶרֶם","before"],["יִצְמָח","it grew."],["כִּי","For"],["אֲנִי","I,"],["יְהוָה","the Lord"],["אֱלֹהִים","God,"],["בָּרָאתִי","created"],["אֶת־כׇּל־הַדְּבָרִים","all things,"],["אֲשֶׁר","of which"],["דִּבַּרְתִּי","I have spoken,"],["בָרוּחַ","spiritually,"],["לִפְנֵי","before"],["הֱיוֹתָם","they were"],["בַּבָּשָׂר","naturally"],["עַל־פְּנֵי","upon the face of"],["הָאָרֶץ","the earth."],["כִּי","For"],["אֲנִי","I,"],["יְהוָה","the Lord"],["אֱלֹהִים","God,"],["לֹא","had not"],["הִמְטַרְתִּי","caused it to rain"],["עַל־הָאָרֶץ","upon the face of the earth."],["וְאֵין","And not"],["אָדָם","a man"],["לַעֲבֹד","to till"],["אֶת־הָאֲדָמָה","the ground;"],["כִּי","for"],["בַשָּׁמַיִם","in heaven"],["בְּרָאתִים","created I them;"],["וְלֹא","and not yet"],["הָיָה","was there"],["בָשָׂר","flesh"],["עַל־הָאָרֶץ","upon the earth,"],["וְלֹא","neither"],["בַמַּיִם","in the water,"],["וְלֹא","neither"],["בָאֲוִיר","in the air;"],["׃",""]
  ]},
  { num: "ו", words: [
    ["אַךְ","But"],["אֵד","a mist"],["עָלָה","went up"],["מִן־הָאָרֶץ","from the earth,"],["וְהִשְׁקָה","and watered"],["אֶת־כׇּל־פְּנֵי","the whole face of"],["הָאֲדָמָה","the ground."],["׃",""]
  ]},
  { num: "ז", words: [
    ["וַאֲנִי","And I,"],["יְהוָה","the Lord"],["אֱלֹהִים","God,"],["יָצַרְתִּי","formed"],["אֶת־הָאָדָם","man"],["עָפָר","from the dust"],["מִן־הָאֲדָמָה","of the ground,"],["וָאֶפַּח","and breathed"],["בְּאַפָּיו","into his nostrils"],["נִשְׁמַת","the breath of"],["חַיִּים","life;"],["וַיְהִי","and became"],["הָאָדָם","man"],["לְנֶפֶשׁ","a soul"],["חַיָּה","living,"],["הַבָּשָׂר","the flesh"],["הָרִאשׁוֹן","first"],["עַל־הָאָרֶץ","upon the earth,"],["וְהָאָדָם","and the man"],["הָרִאשׁוֹן","first"],["גַּם","also;"],["אַךְ","nevertheless,"],["כֹּל","all things"],["נִבְרָא","were created"],["בָרוּחַ","spiritually"],["מִקֶּדֶם","before they were on the earth."],["׃",""]
  ]},
  { num: "ח", words: [
    ["וַאֲנִי","And I,"],["יְהוָה","the Lord"],["אֱלֹהִים","God,"],["נָטַעְתִּי","planted"],["גַּן","a garden"],["בְּעֵדֶן","in Eden,"],["מִקֶּדֶם","eastward,"],["וָאָשִׂם","and I put"],["שָׁם","there"],["אֶת־הָאָדָם","the man,"],["אֲשֶׁר","whom"],["יָצָרְתִּי","I had formed."],["׃",""]
  ]},
  { num: "ט", words: [
    ["וַאֲנִי","And I,"],["יְהוָה","the Lord"],["אֱלֹהִים","God,"],["הִצְמַחְתִּי","made to grow"],["מִן־הָאֲדָמָה","out of the ground"],["כׇּל־עֵץ","every tree,"],["נֶחְמָד","pleasant"],["לְמַרְאֶה","to the sight,"],["וְטוֹב","and good"],["לְמַאֲכׇל","for food;"],["וְעֵץ","and the tree of"],["הַחַיִּים","life,"],["בְּתוֹךְ","in the midst of"],["הַגָּן","the garden,"],["וְעֵץ","and the tree of"],["הַדַּעַת","knowledge of"],["טוֹב","good"],["וָרָע","and evil."],["׃",""]
  ]},
  { num: "י", words: [
    ["וְנָהָר","And a river"],["יֹצֵא","went out"],["מֵעֵדֶן","of Eden"],["לְהַשְׁקוֹת","to water"],["אֶת־הַגָּן","the garden,"],["וּמִשָּׁם","and from thence"],["יִפָּרֵד","it was parted,"],["וְהָיָה","and became"],["לְאַרְבָּעָה","into four"],["רָאשִׁים","heads."],["׃",""]
  ]},
  { num: "יא", words: [
    ["שֵׁם","The name of"],["הָאֶחָד","the first"],["פִּישׁוֹן","is Pison;"],["הוּא","that"],["הַסֹּבֵב","is it which compasseth"],["אֵת",""],["כׇּל־אֶרֶץ","the whole land of"],["הַחֲוִילָה","Havilah,"],["אֲשֶׁר־שָׁם","where there is"],["הַזָּהָב","gold;"],["׃",""]
  ]},
  { num: "יב", words: [
    ["וּזְהַב","And the gold of"],["הָאָרֶץ","the land"],["הַהִוא","that"],["טוֹב","is good;"],["שָׁם","there is"],["הַבְּדֹלַח","bdellium,"],["וְאֶבֶן","and stone of"],["הַשֹּׁהַם","onyx."],["׃",""]
  ]},
  { num: "יג", words: [
    ["וְשֵׁם","And the name of"],["הַנָּהָר","the river"],["הַשֵּׁנִי","second"],["גִּיחוֹן","is Gihon;"],["הוּא","the same"],["הַסֹּבֵב","is it that compasseth"],["אֵת",""],["כׇּל־אֶרֶץ","the whole land of"],["כּוּשׁ","Ethiopia."],["׃",""]
  ]},
  { num: "יד", words: [
    ["וְשֵׁם","And the name of"],["הַנָּהָר","the river"],["הַשְּׁלִישִׁי","third"],["חִדֶּקֶל","is Hiddekel;"],["הוּא","that"],["הַהֹלֵךְ","is it which goeth toward"],["קִדְמַת","the east of"],["אַשּׁוּר","Assyria."],["וְהַנָּהָר","And the river"],["הָרְבִיעִי","fourth"],["הוּא","that"],["פְרָת","is Euphrates."],["׃",""]
  ]},
  { num: "טו", words: [
    ["וַאֲנִי","And I,"],["יְהוָה","the Lord"],["אֱלֹהִים","God,"],["לָקַחְתִּי","took"],["אֶת־הָאָדָם","the man,"],["וָאַנִּחֵהוּ","and put him"],["בְגַן־עֵדֶן","into the Garden of Eden,"],["לְעָבְדָהּ","to dress it,"],["וּלְשָׁמְרָהּ","and to keep it."],["׃",""]
  ]},
  { num: "טז", words: [
    ["וַאֲנִי","And I,"],["יְהוָה","the Lord"],["אֱלֹהִים","God,"],["צִוֵּיתִי","commanded"],["עַל־הָאָדָם","the man,"],["לֵאמֹר","saying:"],["מִכֹּל","Of every"],["עֵץ־הַגָּן","tree of the garden"],["אָכֹל","freely"],["תֹּאכֵל","thou mayest eat,"],["׃",""]
  ]},
  { num: "יז", words: [
    ["אַךְ","But"],["מֵעֵץ","of the tree of"],["הַדַּעַת","the knowledge of"],["טוֹב","good"],["וָרָע","and evil,"],["לֹא","not"],["תֹאכַל","thou shalt eat"],["מִמֶּנּוּ","of it,"],["אַךְ","nevertheless,"],["תּוּכַל","thou mayest"],["לִבְחֹר","choose"],["לְךָ","for thyself,"],["כִּי","for"],["נִתַּן־לָךְ","it is given unto thee;"],["אַךְ","but,"],["זְכֹר","remember"],["כִּי","that"],["אָנֹכִי","I"],["אֹסֵר","forbid"],["אֹתְךָ","it,"],["כִּי","for"],["בְּיוֹם","in the day"],["אֲכָלְךָ","thou eatest"],["מִמֶּנּוּ","thereof,"],["מוֹת","surely"],["תָּמוּת","thou shalt die."],["׃",""]
  ]},
  { num: "יח", words: [
    ["וַאֲנִי","And I,"],["יְהוָה","the Lord"],["אֱלֹהִים","God,"],["אָמַרְתִּי","said"],["אֶל־בְּנִי","unto mine Only Begotten,"],["יְחִידִי","Son,"],["לֹא־טוֹב","that it was not good"],["הֱיוֹת","that should be"],["הָאָדָם","the man"],["לְבַדּוֹ","alone;"],["אֶעֱשֶׂה־לּוֹ","wherefore, I will make"],["עֵזֶר","an help"],["כְּנֶגְדּוֹ","meet for him."],["׃",""]
  ]},
  { num: "יט", words: [
    ["וַאֲנִי","And I,"],["יְהוָה","the Lord"],["אֱלֹהִים","God,"],["יָצַרְתִּי","formed"],["מִן־הָאֲדָמָה","out of the ground"],["כׇּל־חַיַּת","every beast of"],["הַשָּׂדֶה","the field,"],["וְאֵת","and"],["כׇּל־עוֹף","every fowl of"],["הַשָּׁמַיִם","the air;"],["וָאָבִיא","and commanded that they should come"],["אֶל־הָאָדָם","unto Adam,"],["לִרְאוֹת","to see"],["מַה־יִּקְרָא","what he would call"],["לָהֶם","them;"],["וְהֵם","and they"],["גַּם","were also"],["נַפְשׁוֹת","souls"],["חַיּוֹת","living;"],["כִּי","for"],["נָפַחְתִּי","I breathed"],["בָהֶם","into them"],["נִשְׁמַת","the breath of"],["חַיִּים","life,"],["וְכֹל","and whatsoever"],["אֲשֶׁר","that"],["יִקְרָא־לוֹ","called"],["הָאָדָם","Adam"],["נֶפֶשׁ","every creature"],["חַיָּה","living,"],["הוּא","that"],["שְׁמוֹ","was the name thereof."],["׃",""]
  ]},
  { num: "כ", words: [
    ["וַיִּקְרָא","And gave"],["הָאָדָם","Adam"],["שֵׁמוֹת","names"],["לְכׇל־הַבְּהֵמָה","to all cattle,"],["וּלְעוֹף","and to the fowl of"],["הַשָּׁמַיִם","the air,"],["וּלְכֹל","and to every"],["חַיַּת","beast of"],["הַשָּׂדֶה","the field;"],["אַךְ","but"],["לְאָדָם","for Adam"],["לֹא־מָצָא","there was not found"],["עֵזֶר","an help"],["כְּנֶגְדּוֹ","meet for him."],["׃",""]
  ]},
  { num: "כא", words: [
    ["וַאֲנִי","And I,"],["יְהוָה","the Lord"],["אֱלֹהִים","God,"],["הִפַּלְתִּי","caused"],["תַּרְדֵּמָה","a deep sleep to fall"],["עַל־הָאָדָם","upon Adam;"],["וַיִּישָׁן","and he slept,"],["וָאֶקַּח","and I took"],["אַחַת","one"],["מִצַּלְעֹתָיו","of his ribs,"],["וָאֶסְגֹּר","and closed up"],["בָּשָׂר","the flesh"],["תַּחְתֶּנָּה","in the stead thereof;"],["׃",""]
  ]},
  { num: "כב", words: [
    ["וְאֶת־הַצֵּלָע","And the rib"],["אֲשֶׁר","which"],["לָקַחְתִּי","I,"],["מִן־הָאָדָם","the Lord God, had taken from man,"],["בָּנִיתִי","made I"],["לְאִשָּׁה","a woman,"],["וָאֲבִאֶהָ","and brought her"],["אֶל־הָאָדָם","unto the man."],["׃",""]
  ]},
  { num: "כג", words: [
    ["וַיֹּאמֶר","And said"],["הָאָדָם","Adam:"],["זֹאת","This"],["הַפַּעַם","I know now,"],["עֶצֶם","is bone"],["מֵעֲצָמַי","of my bones,"],["וּבָשָׂר","and flesh"],["מִבְּשָׂרִי","of my flesh;"],["לְזֹאת","she"],["יִקָּרֵא","shall be called"],["אִשָּׁה","Woman,"],["כִּי","because"],["מֵאִישׁ","out of man"],["לֻקְחָה־זֹּאת","was she taken."],["׃",""]
  ]},
  { num: "כד", words: [
    ["עַל־כֵּן","Therefore"],["יַעֲזָב־אִישׁ","shall a man leave"],["אֶת־אָבִיו","his father"],["וְאֶת־אִמּוֹ","and his mother,"],["וְדָבַק","and shall cleave"],["בְּאִשְׁתּוֹ","unto his wife;"],["וְהָיוּ","and they shall be"],["לְבָשָׂר","flesh"],["אֶחָד","one."],["׃",""]
  ]},
  { num: "כה", words: [
    ["וַיִּהְיוּ","And they were"],["שְׁנֵיהֶם","both"],["עֲרוּמִּים","naked,"],["הָאָדָם","the man"],["וְאִשְׁתּוֹ","and his wife,"],["וְלֹא","and were not"],["יִתְבֹּשָׁשׁוּ","ashamed."],["׃",""]
  ]}
];
renderVerseSet(ms_ch3Verses, 'ms-ch3-verses');
var ms_ch4Verses = [
  { num: "א", words: [
    ["וָאֹמַר","And I said"],["אֶל־מֹשֶׁה","unto Moses:"],["הַשָּׂטָן","Satan,"],["אֲשֶׁר","whom"],["צִוִּיתָ","thou hast commanded"],["בְּשֵׁם","in the name of"],["יְחִידִי","mine Only Begotten,"],["הוּא","he is"],["אֲשֶׁר","the same which"],["הָיָה","was"],["מֵרֵאשִׁית","from the beginning,"],["וַיָּבֹא","and he came"],["לְפָנַי","before me,"],["לֵאמֹר","saying:"],["הִנְנִי","Behold,"],["שְׁלָחֵנִי","here am I, send me,"],["אֶהְיֶה","I will be"],["בִנְךָ","thy son,"],["וְאֶגְאַל","and I will redeem"],["אֶת־כׇּל־הָאָדָם","all mankind,"],["וְנֶפֶשׁ","that a soul"],["אַחַת","one"],["לֹא","shall not"],["תֹאבַד","be lost,"],["וַאֲנִי","and surely I"],["אֶעֱשֶׂנָּה","will do it;"],["תֶּן־לִי","wherefore give me"],["אֶת־כְּבוֹדֶךָ","thine honor."],["׃",""]
  ]},
  { num: "ב", words: [
    ["אַךְ","But, behold,"],["בְּנִי","my"],["הָאָהוּב","Beloved Son,"],["אֲשֶׁר","which"],["הָיָה","was"],["אֲהוּבִי","my Beloved"],["וּבְחִירִי","and Chosen"],["מֵרֵאשִׁית","from the beginning,"],["וַיֹּאמֶר","said"],["אָבִי","unto me—Father,"],["רְצוֹנְךָ","thy will"],["יֵעָשֶׂה","be done,"],["וְהַכָּבוֹד","and the glory"],["לְךָ","be thine"],["לְעוֹלָם","for ever."],["׃",""]
  ]},
  { num: "ג", words: [
    ["וְעַל־כֵּן","Wherefore,"],["יַעַן","because that"],["מָרַד","rebelled"],["הַשָּׂטָן","Satan"],["בִּי","against me,"],["וַיְבַקֵּשׁ","and sought"],["לְהַשְׁמִיד","to destroy"],["אֶת־בְּחִירַת","the agency of"],["הָאָדָם","man,"],["אֲשֶׁר","which"],["נָתַתִּי","I gave"],["לוֹ","unto him,"],["וְכִי","and also, that"],["אֶתֵּן","I should give"],["לוֹ","him"],["אֶת־כֹּחִי","mine own power;"],["בְּכֹחַ","by the power of"],["יְחִידִי","mine Only Begotten,"],["הוֹרַדְתִּיו","I caused that he should be cast down;"],["׃",""]
  ]},
  { num: "ד", words: [
    ["וַיְהִי","And he became"],["לְשָׂטָן","Satan,"],["אַף","yea, even"],["הַשָּׂטָן","the devil,"],["אֲבִי","the father of"],["כׇל־הַשְּׁקָרִים","all lies,"],["לְהַשִּׁיא","to deceive"],["וּלְעַוֵּר","and to blind"],["אֲנָשִׁים","men,"],["וְלִשְׁבּוֹת","and to lead captive"],["אֹתָם","them"],["כִּרְצוֹנוֹ","at his will,"],["כׇּל־אֲשֶׁר","even as many as"],["לֹא","would not"],["שָׁמְעוּ","hearken"],["בְקוֹלִי","unto my voice."],["׃",""]
  ]},
  { num: "ה", words: [
    ["וְהַנָּחָשׁ","Now the serpent"],["הָיָה","was"],["עָרוּם","more subtle"],["מִכֹּל","than any"],["חַיַּת","beast of"],["הַשָּׂדֶה","the field"],["אֲשֶׁר","which"],["עָשִׂיתִי","I had made."],["׃",""]
  ]},
  { num: "ו", words: [
    ["וַיָּשֶׂם","And put"],["הַשָּׂטָן","Satan"],["בְּלֵב","into the heart of"],["הַנָּחָשׁ","the serpent"],["כִּי","that"],["הִדִּיחַ","he would beguile"],["רַבִּים","many"],["אַחֲרָיו","after him,"],["וַיְבַקֵּשׁ","and he sought"],["גַּם","also"],["לְהַשִּׁיא","to beguile"],["אֶת־חַוָּה","Eve,"],["כִּי","for"],["לֹא","not"],["יָדַע","he knew"],["אֶת־דַּעַת","the mind of"],["אֱלֹהִים","God,"],["וַיְבַקֵּשׁ","wherefore he sought"],["לְהַשְׁמִיד","to destroy"],["אֶת־הָעוֹלָם","the world."],["׃",""]
  ]},
  { num: "ז", words: [
    ["וַיֹּאמֶר","And he said"],["אֶל־הָאִשָּׁה","unto the woman:"],["אַף","Yea,"],["כִּי־אָמַר","hath said"],["אֱלֹהִים","God:"],["לֹא","Not"],["תֹאכְלוּ","ye shall eat"],["מִכֹּל","of every"],["עֵץ","tree of"],["הַגָּן","the garden?"],["וַיְדַבֵּר","And he spake"],["בְּפִי","by the mouth of"],["הַנָּחָשׁ","the serpent."],["׃",""]
  ]},
  { num: "ח", words: [
    ["וַתֹּאמֶר","And said"],["הָאִשָּׁה","the woman"],["אֶל־הַנָּחָשׁ","unto the serpent:"],["מִפְּרִי","Of the fruit of"],["עֵץ־הַגָּן","the trees of the garden"],["נֹאכֵל","we may eat;"],["׃",""]
  ]},
  { num: "ט", words: [
    ["אַךְ","But"],["מִפְּרִי","of the fruit of"],["הָעֵץ","the tree"],["אֲשֶׁר","which"],["אַתָּה","thou"],["רֹאֶה","seest"],["בְּתוֹךְ","in the midst of"],["הַגָּן","the garden,"],["אָמַר","said"],["אֱלֹהִים","God:"],["לֹא","Not"],["תֹאכְלוּ","ye shall eat"],["מִמֶּנּוּ","of it,"],["וְלֹא","neither"],["תִגְּעוּ","shall ye touch"],["בּוֹ","it,"],["פֶּן־תְּמֻתוּן","lest ye die."],["׃",""]
  ]},
  { num: "י", words: [
    ["וַיֹּאמֶר","And said"],["הַנָּחָשׁ","the serpent"],["אֶל־הָאִשָּׁה","unto the woman:"],["לֹא־מוֹת","Surely not"],["תְּמֻתוּן","shall ye die,"],["׃",""]
  ]},
  { num: "יא", words: [
    ["כִּי","For"],["יֹדֵעַ","doth know"],["אֱלֹהִים","God"],["כִּי","that"],["בְּיוֹם","in the day"],["אֲכָלְכֶם","ye eat"],["מִמֶּנּוּ","thereof,"],["וְנִפְקְחוּ","then shall be opened"],["עֵינֵיכֶם","your eyes,"],["וִהְיִיתֶם","and ye shall be"],["כֵּאלֹהִים","as gods,"],["יֹדְעֵי","knowing"],["טוֹב","good"],["וָרָע","and evil."],["׃",""]
  ]},
  { num: "יב", words: [
    ["וַתֵּרֶא","And saw"],["הָאִשָּׁה","the woman"],["כִּי","that"],["טוֹב","was good"],["הָעֵץ","the tree"],["לְמַאֲכׇל","for food,"],["וְכִי","and that"],["תַאֲוָה־הוּא","it was pleasant"],["לָעֵינַיִם","to the eyes,"],["וְנֶחְמָד","and a tree to be desired"],["לְהַשְׂכִּיל","to make one wise;"],["וַתִּקַּח","she took"],["מִפִּרְיוֹ","of the fruit thereof,"],["וַתֹּאכַל","and did eat,"],["וַתִּתֵּן","and gave"],["גַּם־לְאִישָׁהּ","also unto her husband"],["עִמָּהּ","with her,"],["וַיֹּאכַל","and he did eat."],["׃",""]
  ]},
  { num: "יג", words: [
    ["וַתִּפָּקַחְנָה","And were opened"],["עֵינֵי","the eyes of"],["שְׁנֵיהֶם","them both,"],["וַיֵּדְעוּ","and they knew"],["כִּי","that"],["עֵירֻמִּם","naked"],["הֵם","they were;"],["וַיִּתְפְּרוּ","and they sewed"],["עֲלֵה","leaves of"],["תְאֵנָה","a fig tree"],["וַיַּעֲשׂוּ","and made"],["לָהֶם","themselves"],["חֲגֹרֹת","aprons."],["׃",""]
  ]},
  { num: "יד", words: [
    ["וַיִּשְׁמְעוּ","And they heard"],["אֶת־קוֹל","the voice of"],["יְהוָה","the Lord"],["אֱלֹהִים","God,"],["מִתְהַלֵּךְ","as they were walking"],["בַּגָּן","in the garden,"],["לְרוּחַ","in the cool of"],["הַיּוֹם","the day;"],["וַיִּתְחַבֵּא","and hid himself"],["הָאָדָם","Adam"],["וְאִשְׁתּוֹ","and his wife"],["מִפְּנֵי","from the presence of"],["יְהוָה","the Lord"],["אֱלֹהִים","God"],["בְּתוֹךְ","amongst"],["עֵץ","the trees of"],["הַגָּן","the garden."],["׃",""]
  ]},
  { num: "טו", words: [
    ["וָאֶקְרָא","And I called"],["אֶל־הָאָדָם","unto Adam,"],["וָאֹמַר","and said"],["לוֹ","unto him:"],["אָנָה","Where"],["תֵלֵךְ","goest thou?"],["׃",""]
  ]},
  { num: "טז", words: [
    ["וַיֹּאמֶר","And he said:"],["אֶת־קֹלְךָ","Thy voice"],["שָׁמַעְתִּי","I heard"],["בַּגָּן","in the garden,"],["וָאִירָא","and I was afraid,"],["כִּי־עֵירֹם","because that naked"],["אָנֹכִי","I was,"],["וָאֵחָבֵא","and I hid myself."],["׃",""]
  ]},
  { num: "יז", words: [
    ["וָאֹמַר","And I said"],["מִי","unto him: Who"],["הִגִּיד","told"],["לְךָ","thee"],["כִּי","that"],["עֵירֹם","naked"],["אָתָּה","thou wast?"],["הֲמִן־הָעֵץ","Of the tree"],["אֲשֶׁר","whereof"],["צִוִּיתִיךָ","I commanded thee"],["לְבִלְתִּי","that"],["אֲכׇל־מִמֶּנּוּ","thou shouldst not eat,"],["אָכָלְתָּ","hast thou eaten?"],["וְאִם־כֵּן","If so,"],["מוֹת","surely"],["תָּמוּת","thou shouldst die."],["׃",""]
  ]},
  { num: "יח", words: [
    ["וַיֹּאמֶר","And said"],["הָאָדָם","the man:"],["הָאִשָּׁה","The woman"],["אֲשֶׁר","whom"],["נָתַתָּה","thou gavest"],["לִּי","me,"],["וַתְּצַוֵּנִי","and commandedst"],["כִּי","that"],["תִהְיֶה","she should remain"],["עִמִּי","with me,"],["הִוא","she"],["נָתְנָה","gave"],["לִּי","me"],["מִפְּרִי","of the fruit of"],["הָעֵץ","the tree,"],["וָאֹכֵל","and I did eat."],["׃",""]
  ]},
  { num: "יט", words: [
    ["וָאֹמַר","And I,"],["אֶל־הָאִשָּׁה","the Lord God, said unto the woman:"],["מַה־זֹּאת","What is this"],["עָשִׂית","thou hast done?"],["וַתֹּאמֶר","And said"],["הָאִשָּׁה","the woman:"],["הַנָּחָשׁ","The serpent"],["הִשִּׁיאַנִי","beguiled me,"],["וָאֹכֵל","and I did eat."],["׃",""]
  ]},
  { num: "כ", words: [
    ["וָאֹמַר","And I,"],["אֶל־הַנָּחָשׁ","the Lord God, said unto the serpent:"],["כִּי","Because"],["עָשִׂיתָ","thou hast done"],["זֹּאת","this,"],["אָרוּר","cursed art"],["אַתָּה","thou"],["מִכׇּל־הַבְּהֵמָה","above all cattle,"],["וּמִכֹּל","and above every"],["חַיַּת","beast of"],["הַשָּׂדֶה","the field;"],["עַל־גְּחֹנְךָ","upon thy belly"],["תֵלֵךְ","shalt thou go,"],["וְעָפָר","and dust"],["תֹּאכַל","shalt thou eat"],["כׇּל־יְמֵי","all the days of"],["חַיֶּיךָ","thy life;"],["׃",""]
  ]},
  { num: "כא", words: [
    ["וְאֵיבָה","And enmity"],["אָשִׁית","will I put"],["בֵּינְךָ","between thee"],["וּבֵין","and"],["הָאִשָּׁה","the woman,"],["וּבֵין","and between"],["זַרְעֲךָ","thy seed"],["וּבֵין","and"],["זַרְעָהּ","her seed;"],["הוּא","and he"],["יְשׁוּפְךָ","shall bruise thy"],["רֹאשׁ","head,"],["וְאַתָּה","and thou"],["תְּשׁוּפֶנּוּ","shalt bruise his"],["עָקֵב","heel."],["׃",""]
  ]},
  { num: "כב", words: [
    ["אֶל־הָאִשָּׁה","Unto the woman,"],["אָמַרְתִּי","I said:"],["הַרְבָּה","Greatly"],["אַרְבֶּה","I will multiply"],["עִצְּבוֹנֵךְ","thy sorrow"],["וְהֵרֹנֵךְ","and thy conception."],["בְּעֶצֶב","In sorrow"],["תֵּלְדִי","thou shalt bring forth"],["בָנִים","children,"],["וְאֶל־אִישֵׁךְ","and unto thy husband"],["תְּשׁוּקָתֵךְ","shall be thy desire,"],["וְהוּא","and he"],["יִמְשָׁל־בָּךְ","shall rule over thee."],["׃",""]
  ]},
  { num: "כג", words: [
    ["וּלְאָדָם","And unto Adam,"],["אָמַרְתִּי","I, the Lord God, said:"],["כִּי־שָׁמַעְתָּ","Because thou hast hearkened"],["לְקוֹל","unto the voice of"],["אִשְׁתֶּךָ","thy wife,"],["וַתֹּאכַל","and hast eaten"],["מִן־הָעֵץ","of the tree"],["אֲשֶׁר","of which"],["צִוִּיתִיךָ","I commanded thee,"],["לֵאמֹר","saying:"],["לֹא","Not"],["תֹאכַל","shalt thou eat"],["מִמֶּנּוּ","of it—"],["אֲרוּרָה","cursed shall be"],["הָאֲדָמָה","the ground"],["בַּעֲבוּרֶךָ","for thy sake;"],["בְּעִצָּבוֹן","in sorrow"],["תֹּאכְלֶנָּה","shalt thou eat of it"],["כֹּל","all"],["יְמֵי","the days of"],["חַיֶּיךָ","thy life."],["׃",""]
  ]},
  { num: "כד", words: [
    ["וְקוֹץ","Thorns also,"],["וְדַרְדַּר","and thistles,"],["תַּצְמִיחַ","shall it bring forth"],["לָךְ","to thee,"],["וְאָכַלְתָּ","and thou shalt eat"],["אֶת־עֵשֶׂב","the herb of"],["הַשָּׂדֶה","the field."],["׃",""]
  ]},
  { num: "כה", words: [
    ["בְּזֵעַת","By the sweat of"],["אַפֶּיךָ","thy face"],["תֹּאכַל","shalt thou eat"],["לֶחֶם","bread,"],["עַד","until"],["שׁוּבְךָ","thou shalt return"],["אֶל־הָאֲדָמָה","unto the ground—"],["כִּי","for"],["מִמֶּנָּה","out of it"],["לֻקָּחְתָּ","wast thou taken;"],["כִּי־עָפָר","for dust"],["אַתָּה","thou art,"],["וְאֶל־עָפָר","and unto dust"],["תָּשׁוּב","shalt thou return."],["׃",""]
  ]},
  { num: "כו", words: [
    ["וַיִּקְרָא","And called"],["הָאָדָם","Adam"],["שֵׁם","the name of"],["אִשְׁתּוֹ","his wife"],["חַוָּה","Eve,"],["כִּי","because"],["הִוא","she"],["אֵם","was the mother of"],["כׇּל־חָי","all living;"],["כִּי","for"],["כֵן","thus"],["קָרָאתִי","have I,"],["אֶת־הָרִאשׁוֹנָה","the Lord God, called the first"],["לְכׇל־הַנָּשִׁים","of all women,"],["אֲשֶׁר","which"],["הֵן","are"],["רַבּוֹת","many."],["׃",""]
  ]},
  { num: "כז", words: [
    ["וּלְאָדָם","And unto Adam"],["וּלְאִשְׁתּוֹ","and unto his wife"],["עָשִׂיתִי","did I,"],["כָּתְנוֹת","the Lord God, make coats of"],["עוֹר","skins,"],["׃",""]
  ]},
  { num: "כח", words: [
    ["וָאֹמַר","And I,"],["אֶל־יְחִידִי","the Lord God, said unto mine Only Begotten:"],["הֵן","Behold,"],["הָאָדָם","the man"],["הָיָה","is become"],["כְּאַחַד","as one of"],["מִמֶּנּוּ","us"],["לָדַעַת","to know"],["טוֹב","good"],["וָרָע","and evil;"],["וְעַתָּה","and now"],["פֶּן־יִשְׁלַח","lest he put forth"],["יָדוֹ","his hand"],["וְלָקַח","and take"],["גַּם","also"],["מֵעֵץ","of the tree of"],["הַחַיִּים","life,"],["וְאָכַל","and eat"],["וָחַי","and live"],["לְעֹלָם","for ever."],["׃",""]
  ]},
  { num: "כט", words: [
    ["לָכֵן","Therefore"],["אֲשַׁלְּחֶנּוּ","I will send him forth"],["מִגַּן־עֵדֶן","from the Garden of Eden,"],["לַעֲבֹד","to till"],["אֶת־הָאֲדָמָה","the ground"],["אֲשֶׁר","from whence"],["לֻקַּח","he was taken;"],["מִשָּׁם","therefrom"],["׃",""]
  ]},
  { num: "ל", words: [
    ["כִּי","For"],["חַי־אָנִי","as I live,"],["דְּבָרַי","my words"],["לֹא","cannot"],["יָשׁוּבוּ","return"],["רֵיקָם","void;"],["כַּאֲשֶׁר","as"],["יָצְאוּ","they go forth"],["מִפִּי","out of my mouth,"],["יֵעָשׂוּ","they must be fulfilled."],["׃",""]
  ]},
  { num: "לא", words: [
    ["וָאֲגָרֵשׁ","So I drove out"],["אֶת־הָאָדָם","the man,"],["וָאַשְׁכֵּן","and I placed"],["מִקֶּדֶם","at the east of"],["לְגַן־עֵדֶן","the Garden of Eden"],["אֶת־הַכְּרֻבִים","the Cherubim"],["וְלַהַט","and a flame of"],["הַחֶרֶב","sword"],["הַמִּתְהַפֶּכֶת","which turned every way"],["לִשְׁמֹר","to keep"],["אֶת־דֶּרֶךְ","the way of"],["עֵץ","the tree of"],["הַחַיִּים","life."],["׃",""]
  ]},
  { num: "לב", words: [
    ["(אֵלֶּה","These"],["הַדְּבָרִים","the words"],["אֲשֶׁר","which"],["דִּבַּרְתִּי","I spake"],["אֶל־עַבְדִּי","unto my servant"],["מֹשֶׁה","Moses,"],["וַאֲמִתִּים","and true"],["הֵם","are they"],["כַּאֲשֶׁר","even as"],["אֶחְפֹּץ","I will;"],["וַאֲדַבְּרֵם","and I have spoken them"],["אֵלֶיךָ","unto thee."],["אַל־תַּרְאֵם","Show them not"],["לְאִישׁ","unto any man,"],["בִּלְתִּי","except"],["לַמַּאֲמִינִים","unto them that believe."],["אָמֵן׃)","Amen.)"],["׃",""]
  ]}
];
renderVerseSet(ms_ch4Verses, 'ms-ch4-verses');
var ms_ch5Verses = [
  { num: "א", words: [
    ["וַיְהִי","And it came to pass"],["אַחֲרֵי","after"],["אֹתָם","that"],["וַיָּחֶל","began"],["אָדָם","Adam"],["לַעֲבֹד","to till"],["אֶת־הָאֲדָמָה","the earth,"],["וְלִרְדּוֹת","and to have dominion"],["בְּכׇל־חַיַּת","over all the beasts of"],["הַשָּׂדֶה","the field,"],["וְלֶאֱכֹל","and to eat"],["לַחְמוֹ","his bread"],["בְּזֵעַת","by the sweat of"],["אַפּוֹ","his brow,"],["כַּאֲשֶׁר","as"],["צִוִּיתִיו","I, the Lord, had commanded him."],["וְחַוָּה","And Eve,"],["אִשְׁתּוֹ","his wife,"],["גַּם־הִיא","also"],["עָבְדָה","did labor"],["עִמּוֹ","with him."],["׃",""]
  ]},
  { num: "ב", words: [
    ["וַיֵּדַע","And knew"],["אָדָם","Adam"],["אֶת־אִשְׁתּוֹ","his wife,"],["וַתֵּלֶד","and she bare"],["לוֹ","unto him"],["בָּנִים","sons"],["וּבָנוֹת","and daughters,"],["וַיָּחֵלּוּ","and they began"],["לִפְרוֹת","to multiply"],["וְלִרְבּוֹת","and to replenish"],["וּלְמַלֹּאת","and to fill"],["אֶת־הָאָרֶץ","the earth."],["׃",""]
  ]},
  { num: "ג", words: [
    ["וּמֵאָז","And from that time forth,"],["הֵחֵלּוּ","began"],["בְּנֵי","the sons of"],["אָדָם","Adam"],["וּבְנוֹתָיו","and his daughters"],["לְהִפָּרֵד","to divide"],["שְׁנַיִם","two"],["שְׁנַיִם","by two"],["בָּאָרֶץ","in the land,"],["וְלַעֲבֹד","and to till"],["אֶת־הָאֲדָמָה","the land,"],["וְלִרְעוֹת","and to tend"],["צֹאן","flocks,"],["וְהֵם","and they"],["גַּם","also"],["הוֹלִידוּ","begat"],["בָּנִים","sons"],["וּבָנוֹת","and daughters."],["׃",""]
  ]},
  { num: "ד", words: [
    ["וַיִּקְרְאוּ","And called"],["אָדָם","Adam"],["וְחַוָּה","and Eve,"],["אִשְׁתּוֹ","his wife,"],["בְּשֵׁם","upon the name of"],["יְהוָה","the Lord,"],["וַיִּשְׁמְעוּ","and they heard"],["אֶת־קוֹל","the voice of"],["יְהוָה","the Lord"],["מִדֶּרֶךְ","from the way toward"],["גַּן־עֵדֶן","the Garden of Eden,"],["מְדַבֵּר","speaking"],["אֲלֵיהֶם","unto them;"],["וְלֹא","and not"],["רָאוּ","they saw"],["אֶת־פָּנָיו","him,"],["כִּי","for"],["נִסְתְּרוּ","they were shut out"],["מִפָּנָיו","from his presence."],["׃",""]
  ]},
  { num: "ה", words: [
    ["וַיִּתֵּן","And he gave"],["לָהֶם","unto them"],["מִצְוֹת","commandments,"],["לַעֲבֹד","that they should worship"],["אֶת־יְהוָה","the Lord"],["אֱלֹהֵיהֶם","their God,"],["וּלְהַקְרִיב","and should offer"],["אֶת־בְּכֹרוֹת","the firstlings of"],["צֹאנָם","their flocks,"],["קָרְבָּן","for an offering"],["לַיהוָה","unto the Lord."],["וַיִּשְׁמַע","And was obedient"],["אָדָם","Adam"],["לְמִצְוֹת","unto the commandments of"],["יְהוָה","the Lord."],["׃",""]
  ]},
  { num: "ו", words: [
    ["וַיְהִי","And it came to pass"],["מִקֵּץ","after"],["יָמִים","days"],["רַבִּים","many"],["וַיֵּרָא","that appeared"],["מַלְאַךְ","an angel of"],["יְהוָה","the Lord"],["אֶל־אָדָם","unto Adam,"],["וַיֹּאמֶר","saying:"],["לָמָּה","Why"],["תִזְבַּח","dost thou offer sacrifices"],["לַיהוָה","unto the Lord?"],["וַיֹּאמֶר","And said"],["אָדָם","Adam"],["לֹא","not"],["יָדַעְתִּי","unto him: I know,"],["בִּלְתִּי","save"],["כִּי","that"],["צִוַּנִי","commanded me"],["יְהוָה","the Lord."],["׃",""]
  ]},
  { num: "ז", words: [
    ["וַיְדַבֵּר","And spake"],["הַמַּלְאָךְ","the angel"],["לֵאמֹר","saying:"],["הַדָּבָר","The thing"],["הַזֶּה","this"],["לִדְמוּת","is a similitude of"],["קָרְבַּן","the sacrifice of"],["הַיָּחִיד","the Only Begotten"],["לָאָב","of the Father,"],["הַמָּלֵא","which is full of"],["חֶסֶד","grace"],["וֶאֱמֶת","and truth."],["׃",""]
  ]},
  { num: "ח", words: [
    ["לָכֵן","Wherefore,"],["כׇּל־אֲשֶׁר","whatsoever"],["תַּעֲשֶׂה","thou doest,"],["תַּעֲשֶׂה","do it"],["בְּשֵׁם","in the name of"],["הַבֵּן","the Son,"],["וְתָשׁוּב","and thou shalt repent"],["וְקָרָאתָ","and call"],["אֶל־אֱלֹהִים","upon God"],["בְּשֵׁם","in the name of"],["הַבֵּן","the Son"],["לְעוֹלָם","for evermore."],["׃",""]
  ]},
  { num: "ט", words: [
    ["וּבַיּוֹם","And in the day"],["הַהוּא","that"],["נָפְלָה","fell"],["רוּחַ","the Holy Ghost"],["הַקֹּדֶשׁ",""],["עַל־אָדָם","upon Adam,"],["הַמֵּעִידָה","which beareth record of"],["עַל־הָאָב","the Father"],["וְעַל־הַבֵּן","and the Son,"],["לֵאמֹר","saying:"],["הַבֵּן","The Son"],["יְחִיד","is the Only Begotten of"],["הוּא","he"],["לָאָב","the Father"],["מֵרֵאשִׁית","from the beginning,"],["וְעַד־עוֹלָם","henceforth and forever,"],["וְאַתָּה","that as thou"],["אַף","even"],["כִּי","since"],["נָפַלְתָּ","hast fallen,"],["תִּגָּאֵל","thou mayest be redeemed,"],["וְכׇל־הַשֹּׁמֵעַ","and all whoso hearkeneth"],["וּמַאֲמִין","and believeth"],["יִגָּאֵל","shall be redeemed."],["׃",""]
  ]},
  { num: "י", words: [
    ["וּבַיּוֹם","And in the day"],["הַהוּא","that"],["בֵּרַךְ","blessed"],["אָדָם","Adam"],["אֶת־אֱלֹהִים","God"],["וַיִּמָּלֵא","and was filled,"],["וַיָּחֶל","and began"],["לְהִנָּבֵא","to prophesy"],["עַל־כׇּל־מִשְׁפְּחוֹת","concerning all the families of"],["הָאָרֶץ","the earth,"],["לֵאמֹר","saying:"],["בָּרוּךְ","Blessed be"],["שֵׁם","the name of"],["אֱלֹהִים","God,"],["כִּי","for"],["בְּפִשְׁעִי","because of my transgression"],["נִפְקְחוּ","are opened"],["עֵינַי","mine eyes,"],["וּבָעוֹלָם","and in world"],["הַזֶּה","this"],["יִהְיֶה־לִּי","I shall have"],["שִׂמְחָה","joy,"],["וּבַבָּשָׂר","and in the flesh"],["עוֹד","again"],["אֶרְאֶה","I shall see"],["אֱלֹהִים","God."],["׃",""]
  ]},
  { num: "יא", words: [
    ["וַתִּשְׁמַע","And heard"],["חַוָּה","Eve,"],["אִשְׁתּוֹ","his wife,"],["אֶת־כׇּל־הַדְּבָרִים","all the things"],["הָאֵלֶּה","these"],["וַתִּשְׂמַח","and was glad,"],["לֵאמֹר","saying:"],["לוּלֵי","Were it not for"],["פִשְׁעֵנוּ","our transgression,"],["לֹא","not"],["הָיָה","should we have had"],["לָנוּ","unto us"],["זֶרַע","seed,"],["וְלֹא","and not"],["יָדַעְנוּ","should have known"],["לְעוֹלָם","ever"],["טוֹב","good"],["וָרָע","and evil,"],["וְשִׂמְחַת","and the joy of"],["גְּאֻלָּתֵנוּ","our redemption,"],["וְחַיֵּי","and life"],["עוֹלָם","eternal,"],["אֲשֶׁר","which"],["יִתֵּן","giveth"],["אֱלֹהִים","God"],["לְכׇל־הַשֹּׁמְעִים","unto all the obedient."],["׃",""]
  ]},
  { num: "יב", words: [
    ["וַיְבָרֲכוּ","And blessed"],["אָדָם","Adam"],["וְחַוָּה","and Eve"],["אֶת־שֵׁם","the name of"],["אֱלֹהִים","God,"],["וַיּוֹדִיעוּ","and they made known"],["אֶת־כׇּל־הַדְּבָרִים","all things"],["לִבְנֵיהֶם","unto their sons"],["וּלְבְנוֹתֵיהֶם","and their daughters."],["׃",""]
  ]},
  { num: "יג", words: [
    ["וַיָּבֹא","And came"],["הַשָּׂטָן","Satan"],["בְּתוֹכָם","among them,"],["לֵאמֹר","saying:"],["אֲנִי","I am"],["גַם־כֵּן","also"],["בֶּן־אֱלֹהִים","a son of God;"],["וַיְצַו","and he commanded"],["אֹתָם","them,"],["לֵאמֹר","saying:"],["אַל־תַּאֲמִינוּ","Believe it not;"],["וְלֹא","and not"],["הֶאֱמִינוּ","they believed,"],["וַיֶּאֱהֲבוּ","and they loved"],["אֶת־הַשָּׂטָן","Satan"],["מֵאֱלֹהִים","more than God."],["וַיֵּלְכוּ","And went"],["אַחֲרֵי","after"],["תַּאֲוֹת","the lusts of"],["לִבָּם","their own hearts"],["וַיִּתְיַצְּבוּ","and from that time forth became"],["בְּדֶרֶךְ","carnal, sensual, and devilish, as"],["הַשָּׂטָן","Satan."],["׃",""]
  ]},
  { num: "יד", words: [
    ["וַיִּקְרָא","And called"],["יְהוָה","the Lord"],["אֱלֹהִים","God"],["אֶל־הָאָדָם","upon men"],["בְּכׇל־מָקוֹם","everywhere,"],["בְּרוּחַ","by the Holy Ghost,"],["הַקֹּדֶשׁ",""],["וַיְצַו","and commanded"],["אֹתָם","them"],["לָשׁוּב","that they should repent."],["׃",""]
  ]},
  { num: "טו", words: [
    ["וְכֹל","And as many"],["הַמַּאֲמִינִים","as believed"],["בַּבֵּן","in the Son,"],["וְשָׁבִים","and repented"],["מִדַּרְכֵּיהֶם","of their sins,"],["יִוָּשֵׁעוּ","should be saved;"],["וְכֹל","and as many"],["אֲשֶׁר","as"],["לֹא","not"],["יַאֲמִינוּ","believed"],["וְלֹא","and not"],["יָשׁוּבוּ","repented,"],["בַּעֲוֹנָם","in their iniquity"],["יַעַמְדוּ","should be damned;"],["וְהַדָּבָר","and the word"],["הַזֶּה","this"],["יָצָא","went forth"],["מִפִּי","out of the mouth of"],["אֱלֹהִים","God"],["לִגְזֵרָה","as a firm decree."],["׃",""]
  ]},
  { num: "טז", words: [
    ["וְאָדָם","And Adam"],["וְחַוָּה","and Eve,"],["אִשְׁתּוֹ","his wife,"],["לֹא","not"],["חָדְלוּ","ceased"],["לִקְרֹא","to call"],["אֶל־אֱלֹהִים","upon God."],["וַיֵּדַע","And knew"],["אָדָם","Adam"],["אֶת־חַוָּה","Eve"],["אִשְׁתּוֹ","his wife,"],["וַתַּהַר","and she conceived"],["וַתֵּלֶד","and bare"],["אֶת־קַיִן","Cain,"],["וַתֹּאמֶר","and said:"],["קָנִיתִי","I have gotten"],["אִישׁ","a man"],["מֵאֵת","from"],["יְהוָה","the Lord;"],["לָכֵן","wherefore"],["לֹא","not"],["יִמְאַס","may he reject"],["אֶת־דְּבָרָיו","his words."],["וְהִנֵּה","But behold,"],["קַיִן","Cain"],["לֹא","not"],["שָׁמַע","hearkened,"],["לֵאמֹר","saying:"],["מִי","Who is"],["יְהוָה","the Lord"],["כִּי","that"],["אֵדָעֶנּוּ","I should know him?"],["׃",""]
  ]},
  { num: "יז", words: [
    ["וַתַּהַר","And she conceived"],["עוֹד","again"],["וַתֵּלֶד","and bare"],["אֶת־אָחִיו","his brother"],["הָבֶל","Abel."],["וַיִּשְׁמַע","And hearkened"],["הֶבֶל","Abel"],["בְּקוֹל","unto the voice of"],["יְהוָה","the Lord."],["וְהֶבֶל","And Abel"],["הָיָה","was"],["רֹעֵה","a keeper of"],["צֹאן","sheep,"],["וְקַיִן","but Cain"],["הָיָה","was"],["עֹבֵד","a tiller of"],["אֲדָמָה","the ground."],["׃",""]
  ]},
  { num: "יח", words: [
    ["וַיֶּאֱהַב","And loved"],["קַיִן","Cain"],["אֶת־הַשָּׂטָן","Satan"],["מֵאֱלֹהִים","more than God."],["וַיְצַו","And commanded"],["הַשָּׂטָן","Satan"],["אֹתוֹ","him,"],["לֵאמֹר","saying:"],["הָבֵא","Make"],["קָרְבָּן","an offering"],["לַיהוָה","unto the Lord."],["׃",""]
  ]},
  { num: "יט", words: [
    ["וַיְהִי","And it came to pass"],["מִקֵּץ","in process of"],["יָמִים","time"],["וַיָּבֵא","that brought"],["קַיִן","Cain"],["מִפְּרִי","of the fruit of"],["הָאֲדָמָה","the ground"],["מִנְחָה","an offering"],["לַיהוָה","unto the Lord."],["׃",""]
  ]},
  { num: "כ", words: [
    ["וְהֶבֶל","And Abel,"],["גַּם־הוּא","he also"],["הֵבִיא","brought"],["מִבְּכֹרוֹת","of the firstlings of"],["צֹאנוֹ","his flock,"],["וּמֵחֶלְבֵהֶן","and of the fat thereof."],["וַיִּשַׁע","And had respect"],["יְהוָה","the Lord"],["אֶל־הֶבֶל","unto Abel"],["וְאֶל־מִנְחָתוֹ","and to his offering;"],["׃",""]
  ]},
  { num: "כא", words: [
    ["וְאֶל־קַיִן","But unto Cain"],["וְאֶל־מִנְחָתוֹ","and to his offering"],["לֹא","not"],["שָׁעָה","he had respect."],["וְהַשָּׂטָן","Now Satan"],["יָדַע","knew"],["זֹאת","this,"],["וַיִּיטַב","and it pleased him"],["בְּעֵינָיו","in his eyes."],["וַיִּחַר","And was wroth"],["לְקַיִן","Cain,"],["מְאֹד","very,"],["וַיִּפְּלוּ","and fell"],["פָנָיו","his countenance."],["׃",""]
  ]},
  { num: "כב", words: [
    ["וַיֹּאמֶר","And said"],["יְהוָה","the Lord"],["אֶל־קָיִן","unto Cain:"],["לָמָּה","Why"],["חָרָה","art thou wroth?"],["לָךְ","unto thee"],["וְלָמָּה","Why is"],["נָפְלוּ","fallen"],["פָנֶיךָ","thy countenance?"],["׃",""]
  ]},
  { num: "כג", words: [
    ["אִם־תֵּיטִיב","If thou doest well,"],["הֲלֹא","shalt thou not"],["שְׂאֵת","be accepted?"],["וְאִם","And if"],["לֹא","not"],["תֵיטִיב","thou doest well,"],["לַפֶּתַח","at the door"],["חַטָּאת","sin"],["רֹבֵץ","lieth in wait,"],["וְהַשָּׂטָן","and Satan"],["חָפֵץ","desireth"],["לְקַחְתֶּךָ","to have thee;"],["וְאִם","and if"],["לֹא","not"],["תִשְׁמַע","thou shalt hearken"],["לְמִצְוֹתַי","unto my commandments,"],["אֲמַסֶּרְךָ","I will deliver thee up,"],["וִיהִי","and it shall be"],["לְךָ","unto thee"],["כִרְצוֹנוֹ","according to his desire."],["וְאַתָּה","And thou"],["תִּמְשָׁל־בּוֹ","shalt rule over him;"],["׃",""]
  ]},
  { num: "כד", words: [
    ["כִּי","For"],["מֵעַתָּה","from this time forth"],["תִּהְיֶה","thou shalt be"],["אֲבִי","the father of"],["שִׁקְרָיו","his lies;"],["וְיִקָּרֵא","and thou shalt be called"],["לְךָ","unto thee"],["אֲבַדּוֹן","Perdition;"],["כִּי","for"],["הָיִיתָ","thou wast"],["גַּם","also"],["לִפְנֵי","before"],["הָעוֹלָם","the world."],["׃",""]
  ]},
  { num: "כה", words: [
    ["וְיֵאָמֵר","And it shall be said"],["לְעֵת","in time"],["עָתִיד","to come,"],["כִּי","that"],["הַתּוֹעֵבוֹת","abominations"],["הָאֵלֶּה","these"],["הָיוּ","were"],["מִקַּיִן","of Cain,"],["כִּי","for"],["מָאַס","he rejected"],["אֶת־הָעֵצָה","the counsel"],["הַגְּדוֹלָה","greater"],["אֲשֶׁר","which"],["הָיְתָה","was"],["מֵאֵת","of"],["אֱלֹהִים","God."],["וְזֹאת","And this is"],["קְלָלָה","a cursing"],["אֲשֶׁר","which"],["אָשִׂים","I will put"],["עָלֶיךָ","upon thee,"],["אִם־לֹא","except"],["תָשׁוּב","thou repent."],["׃",""]
  ]},
  { num: "כו", words: [
    ["וַיִּחַר","And was wroth"],["לְקַיִן","Cain,"],["וְלֹא","and not"],["שָׁמַע","hearkened"],["עוֹד","any more"],["לְקוֹל","unto the voice of"],["יְהוָה","the Lord,"],["וְלֹא","neither"],["לְהֶבֶל","unto Abel,"],["אָחִיו","his brother,"],["אֲשֶׁר","which"],["הָלַךְ","walked"],["בְּקֹדֶשׁ","in holiness"],["לִפְנֵי","before"],["יְהוָה","the Lord."],["׃",""]
  ]},
  { num: "כז", words: [
    ["וַיִּתְאַבְּלוּ","And mourned"],["אָדָם","Adam"],["וְאִשְׁתּוֹ","and his wife"],["לִפְנֵי","before"],["יְהוָה","the Lord,"],["עַל־קַיִן","because of Cain"],["וְעַל־אֶחָיו","and his brethren."],["׃",""]
  ]},
  { num: "כח", words: [
    ["וַיְהִי","And it came to pass"],["וַיִּקַּח","that took"],["קַיִן","Cain"],["אַחַת","one of"],["מִבְּנוֹת","the daughters of"],["אֶחָיו","his brethren"],["לְאִשָּׁה","to wife;"],["וַיֶּאֱהֲבוּ","and they loved"],["אֶת־הַשָּׂטָן","Satan"],["מֵאֱלֹהִים","more than God."],["׃",""]
  ]},
  { num: "כט", words: [
    ["וַיֹּאמֶר","And said"],["הַשָּׂטָן","Satan"],["אֶל־קַיִן","unto Cain:"],["הִשָּׁבַע","Swear"],["לִי","unto me"],["בְּגְרוֹנֶךָ","by thy throat,"],["וְאִם־תְּגַלֶּה","and if thou tell it"],["מוֹת","surely"],["תָּמוּת","thou shalt die;"],["וְהַשְׁבַּע","and swear"],["גַּם","also"],["אֶת־אַחֶיךָ","thy brethren"],["בֵּאלֹהִים","by the God"],["חַיִּים","living,"],["לְבִלְתִּי","that they should not"],["גַלּוֹת","tell;"],["וְאִם־יְגַלּוּ","for if they tell,"],["מוֹת","surely"],["יָמוּתוּ","they shall die,"],["לְמַעַן","that"],["לֹא","not"],["יֵדַע","shall know"],["אָבִיךָ","thy father."],["וְהַיּוֹם","And this day"],["אֲמַסֵּר","I will deliver"],["אֶת־הֶבֶל","Abel,"],["אָחִיךָ","thy brother,"],["בְּיָדֶךָ","into thine hands."],["׃",""]
  ]},
  { num: "ל", words: [
    ["וַיִּשָּׁבַע","And sware"],["הַשָּׂטָן","Satan"],["לְקַיִן","unto Cain"],["לַעֲשׂוֹת","that he would do"],["כְּמִצְוֹתָיו","according to his commands."],["וְכׇל־הַדְּבָרִים","And all the things"],["הָאֵלֶּה","these"],["נַעֲשׂוּ","were done"],["בַסֵּתֶר","in secret."],["׃",""]
  ]},
  { num: "לא", words: [
    ["וַיֹּאמֶר","And said"],["קַיִן","Cain:"],["אׇמְנָם","Truly,"],["אֲנִי","I am"],["מָהָן","Mahan,"],["אֲדוֹן","the master of"],["הַסּוֹד","mystery"],["הַגָּדוֹל","great"],["הַזֶּה","this,"],["לְמַעַן","that"],["אֶרְצַח","I may murder"],["וְאֶבְצָע","and get gain."],["לָכֵן","Wherefore"],["נִקְרָא","was called"],["קַיִן","Cain"],["מָהָן","Master Mahan,"],["וַיִּתְהַלֵּל","and he gloried"],["בְּרִשְׁעָתוֹ","in his wickedness."],["׃",""]
  ]},
  { num: "לב", words: [
    ["וַיֵּצֵא","And went out"],["קַיִן","Cain"],["הַשָּׂדֶה","into the field,"],["וַיְדַבֵּר","and talked"],["קַיִן","Cain"],["אֶל־הֶבֶל","with Abel,"],["אָחִיו","his brother."],["וַיְהִי","And it came to pass"],["בִּהְיוֹתָם","that, while they were"],["בַּשָּׂדֶה","in the field,"],["וַיָּקׇם","rose up"],["קַיִן","Cain"],["עַל־הֶבֶל","against Abel,"],["אָחִיו","his brother,"],["וַיַּהַרְגֵהוּ","and slew him."],["׃",""]
  ]},
  { num: "לג", words: [
    ["וַיִּתְהַלֵּל","And gloried"],["קַיִן","Cain"],["בַּאֲשֶׁר","in that which"],["עָשָׂה","he had done,"],["לֵאמֹר","saying:"],["אֲנִי","I am"],["חׇפְשִׁי","free;"],["וּמִקְנֵה","surely the flocks of"],["אָחִי","my brother"],["נָפְלוּ","falleth"],["בְּיָדָי","into my hands."],["׃",""]
  ]},
  { num: "לד", words: [
    ["וַיֹּאמֶר","And said"],["יְהוָה","the Lord"],["אֶל־קָיִן","unto Cain:"],["אֵי","Where is"],["הֶבֶל","Abel,"],["אָחִיךָ","thy brother?"],["וַיֹּאמֶר","And he said:"],["לֹא","not"],["יָדַעְתִּי","I know."],["הֲשֹׁמֵר","Am I"],["אָחִי","my brother's"],["אָנֹכִי","keeper?"],["׃",""]
  ]},
  { num: "לה", words: [
    ["וַיֹּאמֶר","And said"],["יְהוָה","the Lord:"],["מֶה","What"],["עָשִׂיתָ","hast thou done?"],["קוֹל","The voice of"],["דְּמֵי","the blood of"],["אָחִיךָ","thy brother"],["צֹעֲקִים","crieth"],["אֵלַי","unto me"],["מִן־הָאֲדָמָה","from the ground."],["׃",""]
  ]},
  { num: "לו", words: [
    ["וְעַתָּה","And now"],["אָרוּר","cursed shalt"],["אָתָּה","thou be"],["מִן־הָאֲדָמָה","from the earth"],["אֲשֶׁר","which"],["פָּצְתָה","hath opened"],["אֶת־פִּיהָ","her mouth"],["לָקַחַת","to receive"],["אֶת־דְּמֵי","the blood of"],["אָחִיךָ","thy brother"],["מִיָּדֶךָ","from thy hand."],["׃",""]
  ]},
  { num: "לז", words: [
    ["כִּי","When"],["תַעֲבֹד","thou tillest"],["אֶת־הָאֲדָמָה","the ground,"],["לֹא־תֹסֵף","not henceforth"],["תֵּת־כֹּחָהּ","shall it yield its strength."],["לָךְ","unto thee"],["נָע","A fugitive"],["וָנָד","and a vagabond"],["תִּהְיֶה","shalt thou be"],["בָאָרֶץ","in the earth."],["׃",""]
  ]},
  { num: "לח", words: [
    ["וַיֹּאמֶר","And said"],["קַיִן","Cain"],["אֶל־יְהוָה","unto the Lord:"],["הַשָּׂטָן","Satan"],["פִּתָּנִי","tempted me"],["בִּגְלַל","because of"],["מִקְנֵה","the flocks of"],["אָחִי","my brother."],["וְגַם","And also"],["חָרָה","was wroth"],["לִי","I,"],["כִּי","for"],["קִבַּלְתָּ","thou didst accept"],["אֶת־קָרְבָּנוֹ","his offering"],["וְלֹא","but not"],["אֶת־קָרְבָּנִי","mine offering;"],["גָּדוֹל","greater is"],["עֲוֹנִי","my punishment"],["מִנְּשֹׂא","than I can bear."],["׃",""]
  ]},
  { num: "לט", words: [
    ["הֵן","Behold,"],["גֵּרַשְׁתָּ","thou hast driven"],["אֹתִי","me out"],["הַיּוֹם","this day"],["מֵעַל","from"],["פְּנֵי","the face of"],["הָאֲדָמָה","the Lord,"],["וּמִפָּנֶיךָ","and from thy face"],["אֶסָּתֵר","shall I be hid;"],["וְהָיִיתִי","and I shall be"],["נָע","a fugitive"],["וָנָד","and a vagabond"],["בָּאָרֶץ","in the earth;"],["וְהָיָה","and it shall come to pass,"],["כׇל־מֹצְאִי","that every one that findeth me"],["יַהַרְגֵנִי","shall slay me,"],["בַּעֲוֹנֹתַי","because of mine iniquities,"],["כִּי","for"],["הַדְּבָרִים","things"],["הָאֵלֶּה","these"],["לֹא","are not"],["נִסְתָּרִים","hid"],["מֵיְהוָה","from the Lord."],["׃",""]
  ]},
  { num: "מ", words: [
    ["וָאֹמַר","And I said"],["אֲנִי","I,"],["יְהוָה","the Lord:"],["כׇּל־הֹרֵג","Whosoever slayeth"],["אֶת־קַיִן","Cain"],["שִׁבְעָתַיִם","sevenfold"],["יֻקָּם","vengeance shall be taken on him."],["וָאָשִׂם","And I set"],["אוֹת","a mark"],["לְקַיִן","upon Cain,"],["לְבִלְתִּי","lest"],["הַכּוֹת","should slay"],["אֹתוֹ","him"],["כׇּל־מֹצְאוֹ","any finding him."],["׃",""]
  ]},
  { num: "מא", words: [
    ["וַיִּסָּגֵר","And was shut out"],["קַיִן","Cain"],["מִלִּפְנֵי","from the presence of"],["יְהוָה","the Lord,"],["וַיֵּשֶׁב","and dwelt"],["עִם־אִשְׁתּוֹ","with his wife"],["וְרַבִּים","and many"],["מֵאֶחָיו","of his brethren"],["בְּאֶרֶץ","in the land of"],["נוֹד","Nod,"],["קִדְמַת־עֵדֶן","on the east of Eden."],["׃",""]
  ]},
  { num: "מב", words: [
    ["וַיֵּדַע","And knew"],["קַיִן","Cain"],["אֶת־אִשְׁתּוֹ","his wife,"],["וַתַּהַר","and she conceived"],["וַתֵּלֶד","and bare"],["אֶת־חֲנוֹךְ","Enoch,"],["וַיּוֹלֶד","and he begat"],["גַּם","also"],["בָּנִים","sons"],["וּבָנוֹת","and daughters"],["רַבִּים","many."],["וַיִּבֶן","And he builded"],["עִיר","a city,"],["וַיִּקְרָא","and called"],["שֵׁם","the name of"],["הָעִיר","the city"],["כְּשֵׁם","after the name of"],["בְּנוֹ","his son,"],["חֲנוֹךְ","Enoch."],["׃",""]
  ]},
  { num: "מג", words: [
    ["וַיִּוָּלֵד","And was born"],["לַחֲנוֹךְ","unto Enoch"],["עִירָד","Irad,"],["וּבָנִים","and sons"],["וּבָנוֹת","and daughters"],["אֲחֵרִים","other."],["וְעִירָד","And Irad"],["יָלַד","begat"],["אֶת־מְחוּיָאֵל","Mehujael,"],["וּבָנִים","and sons"],["וּבָנוֹת","and daughters"],["אֲחֵרִים","other."],["וּמְחוּיָאֵל","And Mehujael"],["יָלַד","begat"],["אֶת־מְתוּשָׁאֵל","Methusael,"],["וּבָנִים","and sons"],["וּבָנוֹת","and daughters"],["אֲחֵרִים","other."],["וּמְתוּשָׁאֵל","And Methusael"],["יָלַד","begat"],["אֶת־לָמֶךְ","Lamech."],["׃",""]
  ]},
  { num: "מד", words: [
    ["וַיִּקַּח־לוֹ","And took unto him"],["לֶמֶךְ","Lamech"],["שְׁתֵּי","two"],["נָשִׁים","wives:"],["שֵׁם","the name of"],["הָאַחַת","the one"],["עָדָה","was Adah,"],["וְשֵׁם","and the name of"],["הַשֵּׁנִית","the other"],["צִלָּה","was Zillah."],["׃",""]
  ]},
  { num: "מה", words: [
    ["וַתֵּלֶד","And bare"],["עָדָה","Adah"],["אֶת־יָבָל","Jabal;"],["הוּא","he"],["הָיָה","was"],["אֲבִי","the father of"],["יֹשֵׁב","such as dwell in"],["אֹהֶל","tents,"],["וּמִקְנֶה","and of such as have cattle."],["וְשֵׁם","And the name of"],["אָחִיו","his brother"],["יוּבָל","was Jubal;"],["הוּא","he"],["הָיָה","was"],["אֲבִי","the father of"],["כׇּל־תֹּפֵשׂ","all such as handle"],["כִּנּוֹר","the harp"],["וְעוּגָב","and organ."],["׃",""]
  ]},
  { num: "מו", words: [
    ["וְצִלָּה","And Zillah,"],["גַם־הִיא","she also"],["יָלְדָה","bare"],["אֶת־תּוּבַל","Tubal"],["קַיִן","Cain,"],["לֹטֵשׁ","an instructor of"],["כׇּל־חֹרֵשׁ","every artificer in"],["נְחֹשֶׁת","brass"],["וּבַרְזֶל","and iron."],["וַאֲחוֹת","And the sister of"],["תּוּבַל־קַיִן","Tubal-Cain"],["נַעֲמָה","was Naamah."],["׃",""]
  ]},
  { num: "מז", words: [
    ["וַיֹּאמֶר","And said"],["לֶמֶךְ","Lamech"],["לְנָשָׁיו","unto his wives,"],["עָדָה","Adah"],["וְצִלָּה","and Zillah:"],["שְׁמַעַן","Hear"],["קוֹלִי","my voice,"],["נְשֵׁי","ye wives of"],["לֶמֶךְ","Lamech,"],["הַאֲזֵנָּה","hearken unto"],["אִמְרָתִי","my speech;"],["כִּי","for"],["אִישׁ","a man"],["הָרַגְתִּי","have I slain"],["לְפִצְעִי","to my wounding,"],["וְיֶלֶד","and a young man"],["לְחַבֻּרָתִי","to my hurt."],["׃",""]
  ]},
  { num: "מח", words: [
    ["כִּי","For"],["שִׁבְעָתַיִם","sevenfold"],["יֻקַּם־קָיִן","shall Cain be avenged,"],["וְלֶמֶךְ","truly Lamech"],["שִׁבְעִים","seventy"],["וְשִׁבְעָה","and sevenfold."],["׃",""]
  ]},
  { num: "מט", words: [
    ["כִּי","For"],["לֶמֶךְ","Lamech"],["כָּרַת","had entered into"],["בְּרִית","a covenant"],["עִם־הַשָּׂטָן","with Satan"],["כְּדֶרֶךְ","after the manner of"],["קַיִן","Cain,"],["וַיְהִי","wherein he became"],["מָהָן","Master Mahan,"],["אֲדוֹן","master of"],["הַסּוֹד","mystery"],["הַגָּדוֹל","great"],["הַהוּא","that,"],["אֲשֶׁר","which"],["נִמְסַר","was administered"],["לְקַיִן","unto Cain"],["מִיַּד","by"],["הַשָּׂטָן","Satan."],["וְעִירָד","And Irad,"],["בֶּן־חֲנוֹךְ","the son of Enoch,"],["יָדַע","having known"],["אֶת־סוֹדָם","their secret,"],["וַיָּחֶל","began"],["לְגַלּוֹתוֹ","to reveal it"],["לִבְנֵי","unto the sons of"],["אָדָם","men;"],["׃",""]
  ]},
  { num: "נ", words: [
    ["לָכֵן","Wherefore"],["הָרַג","slew"],["לֶמֶךְ","Lamech"],["אֹתוֹ","him,"],["בְּחֲרוֹן","in his fierce"],["אַפּוֹ","anger,"],["לֹא","not"],["כַאֲשֶׁר","as"],["הָרַג","slew"],["קַיִן","Cain"],["אֶת־הֶבֶל","Abel,"],["אָחִיו","his brother,"],["לְמַעַן","for the sake of"],["בֶּצַע","getting gain,"],["כִּי","but"],["אִם־הֲרָגוֹ","he slew him"],["לְמַעַן","for the sake of"],["הַשְּׁבוּעָה","the oath."],["׃",""]
  ]},
  { num: "נא", words: [
    ["כִּי","For"],["מִימֵי","from the days of"],["קַיִן","Cain,"],["הָיָה","there was"],["קֶשֶׁר","a combination"],["נִסְתָּר","hidden,"],["וּמַעֲשֵׂיהֶם","and their works"],["הָיוּ","were"],["בַחֹשֶׁךְ","in the dark,"],["וַיֵּדְעוּ","and they knew"],["אִישׁ","every man"],["אֶת־אָחִיו","his brother."],["׃",""]
  ]},
  { num: "נב", words: [
    ["לָכֵן","Wherefore"],["קִלֵּל","cursed"],["יְהוָה","the Lord"],["אֶת־לֶמֶךְ","Lamech,"],["וְאֶת־בֵּיתוֹ","and his house,"],["וְאֵת","and"],["כׇּל־אֲשֶׁר","all them that"],["כָּרְתוּ","had covenanted"],["בְרִית","a covenant"],["עִם־הַשָּׂטָן","with Satan;"],["כִּי","for"],["לֹא","not"],["שָׁמְרוּ","they kept"],["אֶת־מִצְוֹת","the commandments of"],["אֱלֹהִים","God,"],["וְלֹא","and not"],["טוֹב","good"],["הָיָה","was it"],["בְעֵינָיו","in his sight,"],["וְלֹא","and not"],["שֵׁרֵת","he ministered unto"],["אֹתָם","them,"],["וּמַעֲשֵׂיהֶם","and their works"],["תּוֹעֵבָה","abominations"],["הָיוּ","were,"],["וַיָּחֵלּוּ","and began"],["לִפְשֹׂט","to spread"],["בְּכׇל־בְּנֵי","among all the sons of"],["הָאָדָם","men."],["וַיְהִי","And it came to pass"],["בְּתוֹךְ","among"],["בְּנֵי","the sons of"],["הָאָדָם","men"],["׃",""]
  ]},
  { num: "נג", words: [
    ["וּבְתוֹךְ","And it was among"],["בְּנוֹת","the sons of"],["הָאָדָם","men."],["לֹא","Not"],["דֻבְּרוּ","were spoken"],["הַדְּבָרִים","things"],["הָאֵלֶּה","these,"],["כִּי","but"],["לֶמֶךְ","Lamech"],["דִּבֶּר","had spoken"],["אֶת־הַסּוֹד","the secret"],["לְנָשָׁיו","unto his wives,"],["וַתִּמְרֹדְנָה","and they rebelled"],["בוֹ","against him,"],["וַתַּגֵּדְנָה","and declared"],["אֶת־הַדְּבָרִים","these things"],["בַּחוּץ","abroad,"],["וְלֹא","and had not"],["חָמְלוּ","compassion;"],["׃",""]
  ]},
  { num: "נד", words: [
    ["לָכֵן","Wherefore"],["נִבְזָה","despised was"],["לֶמֶךְ","Lamech,"],["וַיִּנָּזֵר","and cast out,"],["וְלֹא","and not"],["בָא","he came"],["עוֹד","any more"],["בְּתוֹךְ","among"],["בְּנֵי","the sons of"],["הָאָדָם","men,"],["פֶּן־יָמוּת","lest he should die."],["׃",""]
  ]},
  { num: "נה", words: [
    ["וְכֵן","And thus"],["הֵחֵלּוּ","began"],["מַעֲשֵׂי","the works of"],["הַחֹשֶׁךְ","darkness"],["לִגְבֹּר","to prevail"],["בְּכׇל־בְּנֵי","among all the sons of"],["הָאָדָם","men."],["׃",""]
  ]},
  { num: "נו", words: [
    ["וַיְקַלֵּל","And cursed"],["אֱלֹהִים","God"],["אֶת־הָאָרֶץ","the earth"],["קְלָלָה","with a curse"],["קָשָׁה","sore,"],["וַיִּחַר","and was angry"],["לוֹ","to him"],["בָרְשָׁעִים","with the wicked,"],["בְּכׇל־בְּנֵי","with all the sons of"],["הָאָדָם","men"],["אֲשֶׁר","whom"],["עָשָׂה","he had made;"],["׃",""]
  ]},
  { num: "נז", words: [
    ["כִּי","For"],["לֹא","not"],["שָׁמְעוּ","they would hearken"],["בְקוֹלוֹ","unto his voice,"],["וְלֹא","nor"],["הֶאֱמִינוּ","believe"],["בִּבְנוֹ","on his Only Begotten"],["הַיָּחִיד","Son,"],["אֲשֶׁר","whom"],["אָמַר","he declared"],["יָבֹא","should come"],["בְּאֶמְצַע","in the meridian of"],["הָעִתִּים","time,"],["אֲשֶׁר","who"],["הוּכַן","was prepared"],["מִלִּפְנֵי","from before"],["יְסוֹד","the foundation of"],["הָעוֹלָם","the world."],["׃",""]
  ]},
  { num: "נח", words: [
    ["וְכֵן","And thus"],["הֵחֵלָּה","began"],["הַבְּשׂוֹרָה","the gospel"],["לְהִקָּרֵא","to be preached"],["מֵרֵאשִׁית","from the beginning,"],["בְּפִי","being declared by"],["מַלְאֲכֵי","angels"],["קֹדֶשׁ","holy"],["הַשְּׁלוּחִים","sent forth"],["מִלִּפְנֵי","from the presence of"],["אֱלֹהִים","God,"],["וּבְקוֹלוֹ","and by his own voice,"],["וּבְמַתַּת","and by the gift of"],["רוּחַ","the Holy Ghost."],["הַקֹּדֶשׁ",""],["׃",""]
  ]},
  { num: "נט", words: [
    ["וְכֵן","And thus"],["נִתְאַמְּתוּ","were confirmed"],["כׇל־הַדְּבָרִים","all things"],["לְאָדָם","unto Adam"],["בְּחֻקַּת","by an holy"],["קֹדֶשׁ","ordinance,"],["וְהַבְּשׂוֹרָה","and the gospel"],["נִקְרְאָה","preached,"],["וּגְזֵרָה","and a decree"],["יָצְאָה","sent forth,"],["כִּי","that"],["תִהְיֶה","it should be"],["בָעוֹלָם","in the world,"],["עַד־קֵץ","until the end thereof;"],["וְכֵן","and thus"],["הָיָה","it was."],["אָמֵן","Amen."],["׃",""]
  ]}
];
renderVerseSet(ms_ch5Verses, 'ms-ch5-verses');
var ms_ch6Verses = [
  { num: "א", words: [
    ["וַיִּשְׁמַע","And hearkened"],["אָדָם","Adam"],["לְקוֹל","unto the voice of"],["אֱלֹהִים","God,"],["וַיִּקְרָא","and called"],["אֶל־בָּנָיו","upon his sons"],["לָשׁוּב","to repent."],["׃",""]
  ]},
  { num: "ב", words: [
    ["וַיֵּדַע","And knew"],["אָדָם","Adam"],["עוֹד","again"],["אֶת־אִשְׁתּוֹ","his wife,"],["וַתֵּלֶד","and she bare"],["בֵּן","a son,"],["וַיִּקְרָא","and he called"],["שְׁמוֹ","his name"],["שֵׁת","Seth."],["וַיְפָאֵר","And glorified"],["אָדָם","Adam"],["אֶת־שֵׁם","the name of"],["אֱלֹהִים","God;"],["כִּי","for"],["אָמַר","he said:"],["שָׁת","Hath appointed"],["לִי","unto me"],["אֱלֹהִים","God"],["זֶרַע","seed"],["אַחֵר","another,"],["תַּחַת","instead of"],["הֶבֶל","Abel,"],["אֲשֶׁר","whom"],["הֲרָגוֹ","slew"],["קָיִן","Cain."],["׃",""]
  ]},
  { num: "ג", words: [
    ["וַיִּגָּלֶה","And revealed himself"],["אֱלֹהִים","God"],["אֶל־שֵׁת","unto Seth,"],["וְלֹא","and not"],["מָרָה","he rebelled,"],["וַיַּקְרֵב","but offered"],["קָרְבָּן","a sacrifice,"],["נִרְצֶה","acceptable"],["כְּאָחִיו","like as his brother"],["הָבֶל","Abel."],["וְגַם־לוֹ","And to him also"],["יֻלַּד","was born"],["בֵּן","a son,"],["וַיִּקְרָא","and he called"],["שְׁמוֹ","his name"],["אֱנוֹשׁ","Enos."],["׃",""]
  ]},
  { num: "ד", words: [
    ["וְאָז","And then"],["הֵחֵלּוּ","began"],["הָאֲנָשִׁים","the men"],["הָאֵלֶּה","these"],["לִקְרֹא","to call"],["בְּשֵׁם","upon the name of"],["יְהוָה","the Lord,"],["וַיְבָרֲכֵם","and blessed them"],["יְהוָה","the Lord."],["׃",""]
  ]},
  { num: "ה", words: [
    ["וְסֵפֶר","And a book of"],["זִכָּרוֹן","remembrance"],["נִכְתַּב","was kept,"],["בּוֹ","in the which"],["בִּלְשׁוֹן","in the language of"],["אָדָם","Adam,"],["כִּי","for"],["נִתַּן","it was given"],["לְכׇל־הַקֹּרְאִים","unto as many as called"],["אֶל־אֱלֹהִים","upon God"],["לִכְתֹּב","to write"],["בְּרוּחַ","by the spirit of"],["נְבוּאָה","inspiration;"],["׃",""]
  ]},
  { num: "ו", words: [
    ["וּבוֹ","And in it"],["לִמְּדוּ","they taught"],["אֶת־בְּנֵיהֶם","their children"],["לִקְרֹא","to read"],["וְלִכְתֹּב","and write,"],["בְּלָשׁוֹן","having a language"],["טְהוֹרָה","which was pure"],["וּבְלִי־מוּם","and undefiled."],["׃",""]
  ]},
  { num: "ז", words: [
    ["וְהַכְּהֻנָּה","Now the same Priesthood"],["הַזֹּאת","this,"],["אֲשֶׁר","which"],["הָיְתָה","was"],["בָרֵאשִׁית","in the beginning,"],["תִּהְיֶה","shall be"],["גַּם","also"],["בְּאַחֲרִית","in the end of"],["הָעוֹלָם","the world."],["׃",""]
  ]},
  { num: "ח", words: [
    ["וְאֶת־הַנְּבוּאָה","Now the prophecy"],["הַזֹּאת","this"],["דִּבֶּר","spake"],["אָדָם","Adam,"],["כַּאֲשֶׁר","as"],["נָעָה","he was moved"],["עָלָיו","upon by"],["רוּחַ","the Holy Ghost."],["הַקֹּדֶשׁ",""],["וְסֵפֶר","And a book of"],["תּוֹלְדֹת","generations"],["נִכְתַּב","was kept"],["לִבְנֵי","of the children of"],["הָאֱלֹהִים","God."],["וְזֶה","And this was"],["סֵפֶר","the book of"],["תּוֹלְדֹת","the generations of"],["אָדָם","Adam,"],["לֵאמֹר","saying:"],["בְּיוֹם","In the day that"],["בְּרֹא","created"],["אֱלֹהִים","God"],["אָדָם","man,"],["בִּדְמוּת","in the likeness of"],["אֱלֹהִים","God"],["עָשָׂה","made he"],["אֹתוֹ","him."],["׃",""]
  ]},
  { num: "ט", words: [
    ["בְּצֶלֶם","In the image of"],["גּוּפוֹ","his own body,"],["זָכָר","male"],["וּנְקֵבָה","and female,"],["בְּרָאָם","created he them,"],["וַיְבָרֲכֵם","and blessed them,"],["וַיִּקְרָא","and called"],["שְׁמָם","their name"],["אָדָם","Adam"],["בְּיוֹם","in the day"],["הִבָּרְאָם","when they were created"],["בִּהְיוֹתָם","and became"],["נְפָשׁוֹת","souls"],["חַיּוֹת","living"],["בָּאָרֶץ","in the land"],["עַל־הֲדֹם","upon the footstool of"],["רַגְלֵי","the feet of"],["אֱלֹהִים","God."],["׃",""]
  ]},
  { num: "י", words: [
    ["וַיְחִי","And lived"],["אָדָם","Adam"],["מְאָה","an hundred"],["וּשְׁלֹשִׁים","and thirty"],["שָׁנָה","years,"],["וַיּוֹלֶד","and begat"],["בֵּן","a son"],["בִּדְמוּתוֹ","in his own likeness,"],["כְּצַלְמוֹ","after his own image,"],["וַיִּקְרָא","and called"],["שְׁמוֹ","his name"],["שֵׁת","Seth."],["׃",""]
  ]},
  { num: "יא", words: [
    ["וַיִּהְיוּ","And were"],["יְמֵי","the days of"],["אָדָם","Adam"],["אַחֲרֵי","after"],["הוֹלִידוֹ","he had begotten"],["אֶת־שֵׁת","Seth"],["שְׁמֹנֶה","eight"],["מֵאוֹת","hundred"],["שָׁנָה","years;"],["וַיּוֹלֶד","and he begat"],["בָּנִים","sons"],["וּבָנוֹת","and daughters,"],["רַבִּים","many."],["׃",""]
  ]},
  { num: "יב", words: [
    ["וַיִּהְיוּ","And were"],["כׇּל־יְמֵי","all the days of"],["אָדָם","Adam"],["אֲשֶׁר־חַי","which he lived,"],["תְּשַׁע","nine"],["מֵאוֹת","hundred"],["וּשְׁלֹשִׁים","and thirty"],["שָׁנָה","years,"],["וַיָּמֹת","and he died."],["׃",""]
  ]},
  { num: "יג", words: [
    ["וַיְחִי","And lived"],["שֵׁת","Seth"],["מֵאָה","an hundred"],["וְחָמֵשׁ","and five"],["שָׁנִים","years,"],["וַיּוֹלֶד","and begat"],["אֶת־אֱנוֹשׁ","Enos,"],["וַיִּתְנַבֵּא","and he prophesied"],["כׇּל־יָמָיו","all his days,"],["וַיְלַמֵּד","and taught"],["אֶת־בְּנוֹ","his son"],["אֱנוֹשׁ","Enos"],["בְּדַרְכֵי","in the ways of"],["אֱלֹהִים","God;"],["לָכֵן","wherefore"],["נִבָּא","prophesied"],["גַּם","also"],["אֱנוֹשׁ","Enos."],["׃",""]
  ]},
  { num: "יד", words: [
    ["וַיְחִי","And lived"],["שֵׁת","Seth"],["אַחֲרֵי","after"],["הוֹלִידוֹ","he begat"],["אֶת־אֱנוֹשׁ","Enos"],["שְׁמֹנֶה","eight"],["מֵאוֹת","hundred"],["וְשֶׁבַע","and seven"],["שָׁנִים","years,"],["וַיּוֹלֶד","and begat"],["בָּנִים","sons"],["וּבָנוֹת","and daughters,"],["רַבִּים","many."],["׃",""]
  ]},
  { num: "טו", words: [
    ["וּבְנֵי","And the children of"],["הָאָדָם","men"],["רַבּוּ","were numerous"],["עַל־כׇּל־פְּנֵי","upon all the face of"],["הָאָרֶץ","the land."],["וּבַיָּמִים","And in the days"],["הָהֵם","those"],["מָשַׁל","reigned"],["הַשָּׂטָן","Satan"],["מֶמְשָׁלָה","with dominion"],["גְּדוֹלָה","great"],["בָּאֲנָשִׁים","among men,"],["וַיִּזְעַם","and raged"],["בְּלִבָּם","in their hearts;"],["וּמֵאָז","and from thenceforth"],["בָּאוּ","came"],["מִלְחָמוֹת","wars"],["וּשְׁפִיכוּת","and shedding of"],["דָּמִים","blood,"],["וְיַד־אִישׁ","and a man's hand"],["בְּאָחִיו","was against his own brother,"],["לְהָמִית","in administering death,"],["בִּגְלַל","because of"],["מַעֲשֵׂי","works"],["סֵתֶר","secret,"],["לְבַקֵּשׁ","seeking for"],["כֹּחַ","power."],["׃",""]
  ]},
  { num: "טז", words: [
    ["וַיִּהְיוּ","And were"],["כׇּל־יְמֵי","all the days of"],["שֵׁת","Seth"],["תְּשַׁע","nine"],["מֵאוֹת","hundred"],["וּשְׁתֵּים","and two-"],["עֶשְׂרֵה","ten = twelve"],["שָׁנָה","years,"],["וַיָּמֹת","and he died."],["׃",""]
  ]},
  { num: "יז", words: [
    ["וַיְחִי","And lived"],["אֱנוֹשׁ","Enos"],["תִּשְׁעִים","ninety"],["שָׁנָה","years,"],["וַיּוֹלֶד","and begat"],["אֶת־קֵינָן","Cainan."],["וְאֱנוֹשׁ","And Enos"],["וּשְׁאֵרִית","and the residue of"],["עַם","the people of"],["אֱלֹהִים","God"],["יָצְאוּ","came out"],["מִן־הָאָרֶץ","from the land,"],["הַנִּקְרֵאת","which was called"],["שׁוּלוֹן","Shulon,"],["וַיֵּשְׁבוּ","and dwelt"],["בְּאֶרֶץ","in a land of"],["הַבְּטָחָה","promise,"],["אֲשֶׁר","which"],["קָרָא","he called"],["לָהּ","it"],["עַל־שֵׁם","after the name of"],["בְּנוֹ","his own son,"],["אֲשֶׁר","whom"],["קָרָא","he had named"],["לוֹ","him"],["קֵינָן","Cainan."],["׃",""]
  ]},
  { num: "יח", words: [
    ["וַיְחִי","And lived"],["אֱנוֹשׁ","Enos"],["אַחֲרֵי","after"],["הוֹלִידוֹ","he begat"],["אֶת־קֵינָן","Cainan"],["שְׁמֹנֶה","eight"],["מֵאוֹת","hundred"],["וַחֲמֵשׁ","and five-"],["עֶשְׂרֵה","ten = fifteen"],["שָׁנָה","years,"],["וַיּוֹלֶד","and begat"],["בָּנִים","sons"],["וּבָנוֹת","and daughters,"],["רַבִּים","many."],["וַיִּהְיוּ","And were"],["כׇּל־יְמֵי","all the days of"],["אֱנוֹשׁ","Enos"],["תְּשַׁע","nine"],["מֵאוֹת","hundred"],["וְחָמֵשׁ","and five"],["שָׁנִים","years,"],["וַיָּמֹת","and he died."],["׃",""]
  ]},
  { num: "יט", words: [
    ["וַיְחִי","And lived"],["קֵינָן","Cainan"],["שִׁבְעִים","seventy"],["שָׁנָה","years,"],["וַיּוֹלֶד","and begat"],["אֶת־מַהֲלַלְאֵל","Mahalaleel."],["וַיְחִי","And lived"],["קֵינָן","Cainan"],["אַחֲרֵי","after"],["הוֹלִידוֹ","he begat"],["אֶת־מַהֲלַלְאֵל","Mahalaleel"],["שְׁמֹנֶה","eight"],["מֵאוֹת","hundred"],["וְאַרְבָּעִים","and forty"],["שָׁנָה","years,"],["וַיּוֹלֶד","and begat"],["בָּנִים","sons"],["וּבָנוֹת","and daughters."],["וַיִּהְיוּ","And were"],["כׇּל־יְמֵי","all the days of"],["קֵינָן","Cainan"],["תְּשַׁע","nine"],["מֵאוֹת","hundred"],["וָעֶשֶׂר","and ten"],["שָׁנִים","years,"],["וַיָּמֹת","and he died."],["׃",""]
  ]},
  { num: "כ", words: [
    ["וַיְחִי","And lived"],["מַהֲלַלְאֵל","Mahalaleel"],["חָמֵשׁ","sixty"],["וְשִׁשִּׁים","and five"],["שָׁנָה","years,"],["וַיּוֹלֶד","and begat"],["אֶת־יֶרֶד","Jared;"],["וַיְחִי","and lived"],["מַהֲלַלְאֵל","Mahalaleel"],["אַחֲרֵי","after"],["הוֹלִידוֹ","he begat"],["אֶת־יֶרֶד","Jared"],["שְׁמֹנֶה","eight"],["מֵאוֹת","hundred"],["וּשְׁלֹשִׁים","and thirty"],["שָׁנָה","years,"],["וַיּוֹלֶד","and begat"],["בָּנִים","sons"],["וּבָנוֹת","and daughters."],["וַיִּהְיוּ","And were"],["כׇּל־יְמֵי","all the days of"],["מַהֲלַלְאֵל","Mahalaleel"],["שְׁמֹנֶה","eight"],["מֵאוֹת","hundred"],["וְתִשְׁעִים","and ninety"],["וְחָמֵשׁ","and five"],["שָׁנִים","years,"],["וַיָּמֹת","and he died."],["׃",""]
  ]},
  { num: "כא", words: [
    ["וַיְחִי","And lived"],["יֶרֶד","Jared"],["מֵאָה","an hundred"],["וְשִׁשִּׁים","and sixty"],["וּשְׁתַּיִם","and two"],["שָׁנָה","years,"],["וַיּוֹלֶד","and begat"],["אֶת־חֲנוֹךְ","Enoch;"],["וַיְחִי","and lived"],["יֶרֶד","Jared"],["אַחֲרֵי","after"],["הוֹלִידוֹ","he begat"],["אֶת־חֲנוֹךְ","Enoch"],["שְׁמֹנֶה","eight"],["מֵאוֹת","hundred"],["שָׁנָה","years,"],["וַיּוֹלֶד","and begat"],["בָּנִים","sons"],["וּבָנוֹת","and daughters."],["וַיְלַמֵּד","And taught"],["יֶרֶד","Jared"],["אֶת־חֲנוֹךְ","Enoch,"],["בְּכׇל־דַּרְכֵי","in all the ways of"],["אֱלֹהִים","God."],["׃",""]
  ]},
  { num: "כב", words: [
    ["וְזֶה","And this"],["סֵפֶר","is the book of"],["תּוֹלְדֹת","the generations of"],["בְּנֵי","the sons of"],["אָדָם","Adam,"],["אֲשֶׁר","who"],["הוּא","was"],["בֶּן־אֱלֹהִים","the son of God,"],["אֲשֶׁר","with whom"],["דִּבֶּר","talked"],["אֱלֹהִים","God"],["עִמּוֹ","with him"],["׃",""]
  ]},
  { num: "כג", words: [
    ["וַיִּהְיוּ","And they were"],["צֶדֶק","preachers of righteousness,"],["וַיְדַבְּרוּ","and they spake"],["וַיִּתְנַבְּאוּ","and prophesied,"],["וַיִּקְרְאוּ","and called"],["אֶל־כׇּל־הָאָדָם","upon all men,"],["בְּכׇל־מָקוֹם","everywhere,"],["לָשׁוּב","to repent;"],["וֶאֱמוּנָה","and faith"],["נִלְּמְדָה","was taught"],["לִבְנֵי","unto the children of"],["הָאָדָם","men."],["׃",""]
  ]},
  { num: "כד", words: [
    ["וַיְהִי","And were"],["כׇּל־יְמֵי","all the days of"],["יֶרֶד","Jared"],["תְּשַׁע","nine"],["מֵאוֹת","hundred"],["וְשִׁשִּׁים","and sixty"],["וּשְׁתַּיִם","and two"],["שָׁנָה","years,"],["וַיָּמֹת","and he died."],["׃",""]
  ]},
  { num: "כה", words: [
    ["וַיְחִי","And lived"],["חֲנוֹךְ","Enoch"],["חָמֵשׁ","sixty"],["וְשִׁשִּׁים","and five"],["שָׁנָה","years,"],["וַיּוֹלֶד","and begat"],["אֶת־מְתוּשֶׁלַח","Methuselah."],["׃",""]
  ]},
  { num: "כו", words: [
    ["וַיְהִי","And it came to pass"],["וַיֵּלֶךְ","that journeyed"],["חֲנוֹךְ","Enoch"],["בָּאָרֶץ","in the land,"],["בְּתוֹךְ","among"],["הָעָם","the people."],["וְכַאֲשֶׁר","And as"],["הָלַךְ","he journeyed,"],["וַתֵּרֶד","descended"],["רוּחַ","the Spirit of"],["אֱלֹהִים","God"],["מִן־הַשָּׁמַיִם","from heaven,"],["וַתִּשְׁכֹּן","and abode"],["עָלָיו","upon him."],["׃",""]
  ]},
  { num: "כז", words: [
    ["וַיִּשְׁמַע","And he heard"],["קוֹל","a voice"],["מִן־הַשָּׁמַיִם","from heaven,"],["לֵאמֹר","saying:"],["חֲנוֹךְ","Enoch,"],["בְּנִי","my son,"],["הִנָּבֵא","prophesy"],["אֶל־הָעָם","unto people"],["הַזֶּה","this,"],["וְאָמַרְתָּ","and say"],["אֲלֵיהֶם","unto them—"],["שׁוּבוּ","Repent,"],["כִּי","for"],["כֹה","thus"],["אָמַר","saith"],["יְהוָה","the Lord:"],["קָצַפְתִּי","I am angry"],["עַל־הָעָם","with people"],["הַזֶּה","this,"],["וְחֲרוֹן","and my fierce"],["אַפִּי","anger"],["בָּעַר","is kindled"],["בָּם","against them;"],["כִּי","for"],["הִקְשׁוּ","they have hardened"],["אֶת־לִבָּם","their hearts,"],["וְאׇזְנֵיהֶם","and their ears"],["כְּבֵדוֹת","are dull"],["מִשְּׁמֹעַ","of hearing,"],["וְעֵינֵיהֶם","and their eyes"],["לֹא","cannot"],["תוּכַלְנָה","be able"],["לִרְאוֹת","to see"],["לְמֵרָחוֹק","afar off;"],["׃",""]
  ]},
  { num: "כח", words: [
    ["וּמִדֹּרוֹת","And for generations"],["רַבִּים","many,"],["אֵלֶּה","these,"],["מִיּוֹם","ever since the day that"],["בְּרָאתִים","I created them,"],["סָרוּ","have they gone astray,"],["וְכִחֲשׁוּ","and have denied"],["בִי","me,"],["וַיְבַקְּשׁוּ","and have sought"],["עֲצָתָם","their own counsels"],["בַּחֹשֶׁךְ","in the dark;"],["וּבְתוֹעֲבוֹתֵיהֶם","and in their own abominations"],["חָשְׁבוּ","have they devised"],["רֶצַח","murder,"],["וְלֹא","and have not"],["שָׁמְרוּ","kept"],["אֶת־הַמִּצְוֹת","the commandments,"],["אֲשֶׁר","which"],["נָתַתִּי","I gave"],["לַאֲבִיהֶם","unto their father,"],["אָדָם","Adam."],["׃",""]
  ]},
  { num: "כט", words: [
    ["לָכֵן","Wherefore,"],["נִשְׁבְּעוּ","they have sworn"],["לַשָּׁקֶר","falsely,"],["וּבִשְׁבוּעֹתֵיהֶם","and by their oaths,"],["הֵבִיאוּ","they have brought"],["עֲלֵיהֶם","upon themselves"],["מָוֶת","death;"],["וּשְׁאוֹל","and a hell"],["הֲכִינוֹתִי","I have prepared"],["לָהֶם","for them,"],["אִם־לֹא","if"],["יָשׁוּבוּ","they repent not."],["׃",""]
  ]},
  { num: "ל", words: [
    ["וְזֹאת","And this is"],["גְּזֵרָה","a decree"],["אֲשֶׁר","which"],["שָׁלַחְתִּי","I have sent forth"],["בְּרֵאשִׁית","in the beginning of"],["הָעוֹלָם","the world,"],["מִפִּי","from my own mouth,"],["מִיְּסוֹדוֹ","from the foundation thereof,"],["וּבְפִי","and by the mouths of"],["עֲבָדַי","my servants"],["אֲבוֹתֶיךָ","thy fathers,"],["גְּזַרְתִּיהּ","have I decreed it,"],["כַּאֲשֶׁר","even as"],["תִּשָּׁלַח","it shall be sent forth"],["בָּעוֹלָם","in the world"],["עַד־קִצּוֹ","unto the ends thereof."],["׃",""]
  ]},
  { num: "לא", words: [
    ["וַיְהִי","And it came to pass"],["כַּאֲשֶׁר","that when"],["שָׁמַע","heard"],["חֲנוֹךְ","Enoch"],["אֶת־הַדְּבָרִים","words"],["הָאֵלֶּה","these,"],["וַיִּשְׁתַּחוּ","he bowed himself"],["אָרְצָה","to the earth"],["לִפְנֵי","before"],["יְהוָה","the Lord,"],["וַיְדַבֵּר","and spake"],["לִפְנֵי","before"],["יְהוָה","the Lord,"],["לֵאמֹר","saying:"],["מַדּוּעַ","Why is it that"],["מָצָאתִי","I have found"],["חֵן","favor"],["בְּעֵינֶיךָ","in thy sight,"],["וַאֲנִי","and am but"],["נַעַר","a lad,"],["וְכׇל־הָעָם","and all the people"],["שֹׂנְאִים","hate"],["אֹתִי","me;"],["כִּי","for"],["כְבַד־פֶּה","slow of speech"],["אָנֹכִי","am I;"],["וְלָמָּה","wherefore"],["אֲנִי","am I"],["עַבְדֶּךָ","thy servant?"],["׃",""]
  ]},
  { num: "לב", words: [
    ["וַיֹּאמֶר","And said"],["יְהוָה","the Lord"],["אֶל־חֲנוֹךְ","unto Enoch:"],["לֵךְ","Go forth"],["וַעֲשֵׂה","and do"],["כַּאֲשֶׁר","as"],["צִוִּיתִיךָ","I have commanded thee,"],["וְאִישׁ","and no man"],["לֹא","not"],["יִדְקָרְךָ","shall pierce thee."],["פְּתַח","Open"],["פִּיךָ","thy mouth,"],["וְיִמָּלֵא","and it shall be filled,"],["וְאֶתֵּן","and I will give"],["לְךָ","thee"],["מַעֲנֶה","utterance,"],["כִּי","for"],["כׇל־בָּשָׂר","all flesh"],["בְּיָדִי","is in my hands,"],["וְאֶעֱשֶׂה","and I will do"],["כַּטּוֹב","as good"],["בְּעֵינָי","in mine eyes."],["׃",""]
  ]},
  { num: "לג", words: [
    ["אֱמֹר","Say"],["אֶל־הָעָם","unto people"],["הַזֶּה","this:"],["בַּחֲרוּ","Choose ye"],["הַיּוֹם","this day,"],["לַעֲבֹד","to serve"],["אֶת־יְהוָה","the Lord"],["אֱלֹהִים","God"],["אֲשֶׁר","who"],["עֲשָׂאכֶם","made you."],["׃",""]
  ]},
  { num: "לד", words: [
    ["הִנֵּה","Behold"],["רוּחִי","my Spirit is"],["עָלֶיךָ","upon thee,"],["לָכֵן","wherefore"],["כׇּל־דְּבָרֶיךָ","all thy words"],["אֲצַדֵּק","will I justify;"],["וְהֶהָרִים","and the mountains"],["יָנוּסוּ","shall flee"],["מִפָּנֶיךָ","before thee,"],["וְהַנְּהָרוֹת","and the rivers"],["יִסֹּבּוּ","shall turn"],["מִדַּרְכָּם","from their course;"],["וְתִשְׁכֹּן","and thou shalt abide"],["בִּי","in me,"],["וַאֲנִי","and I"],["בָךְ","in thee;"],["לָכֵן","therefore"],["הִתְהַלֵּךְ","walk"],["עִמִּי","with me."],["׃",""]
  ]},
  { num: "לה", words: [
    ["וַיְדַבֵּר","And spake"],["יְהוָה","the Lord"],["אֶל־חֲנוֹךְ","unto Enoch,"],["וַיֹּאמֶר","and said"],["אֵלָיו","unto him:"],["מְשַׁח","Anoint"],["עֵינֶיךָ","thine eyes"],["בְּטִיט","with clay,"],["וּרְחָצֵם","and wash them,"],["וְתִרְאֶה","and thou shalt see."],["וַיַּעַשׂ","And he did"],["כֵּן","so."],["׃",""]
  ]},
  { num: "לו", words: [
    ["וַיַּרְא","And he beheld"],["אֶת־הָרוּחוֹת","the spirits"],["אֲשֶׁר","which"],["בָּרָא","had created"],["אֱלֹהִים","God,"],["וַיַּרְא","and he beheld"],["גַּם","also"],["דְּבָרִים","things"],["אֲשֶׁר","which"],["לֹא","not"],["נִרְאוּ","are seen"],["לְעֵין","by the eye"],["הַבָּשָׂר","of the flesh;"],["וּמֵאָז","and from thenceforth"],["יָצָא","went forth"],["הַדָּבָר","the saying"],["בָּאָרֶץ","in the land,"],["לֵאמֹר","saying:"],["רֹאֶה","A seer"],["הֵקִים","hath raised up"],["יְהוָה","the Lord"],["לְעַמּוֹ","unto his people."],["׃",""]
  ]},
  { num: "לז", words: [
    ["וַיְהִי","And it came to pass"],["וַיֵּצֵא","that went forth"],["חֲנוֹךְ","Enoch"],["בָּאָרֶץ","in the land,"],["בְּתוֹךְ","among"],["הָעָם","the people,"],["וַיַּעֲמֹד","and standing"],["עַל־הַגְּבָעוֹת","upon the hills"],["וְעַל־הַמְּקֹמוֹת","and the places"],["הַגְּבֹהִים","high,"],["וַיִּקְרָא","and cried"],["בְּקוֹל","with a voice"],["גָּדוֹל","loud,"],["וַיָּעַד","and testified"],["עַל־מַעֲשֵׂיהֶם","against their works;"],["וַיִּכָּשְׁלוּ","and were offended"],["כׇל־הָאֲנָשִׁים","all men"],["בּוֹ","because of him."],["׃",""]
  ]},
  { num: "לח", words: [
    ["וַיָּבֹאוּ","And they came forth"],["לִשְׁמֹעַ","to hear"],["אֹתוֹ","him,"],["עַל־הַמְּקֹמוֹת","upon the places"],["הַגְּבֹהִים","high,"],["וַיֹּאמְרוּ","saying"],["אֶל־שֹׁמְרֵי","unto the keepers of"],["הָאֹהָלִים","the tents:"],["שְׁבוּ","Tarry ye"],["פֹה","here"],["וְשִׁמְרוּ","and keep"],["אֶת־הָאֹהָלִים","the tents,"],["וַאֲנַחְנוּ","while we"],["נֵלְכָה","go"],["שָׁמָּה","yonder"],["לִרְאוֹת","to behold"],["אֶת־הָרֹאֶה","the seer,"],["כִּי","for"],["הוּא","he"],["מִתְנַבֵּא","prophesieth,"],["וְדָבָר","and there is"],["זָר","a strange thing"],["בָּאָרֶץ","in the land;"],["אִישׁ","a man"],["פֶּרֶא","wild"],["בָּא","hath come"],["בֵינֵינוּ","among us."],["׃",""]
  ]},
  { num: "לט", words: [
    ["וַיְהִי","And it came to pass"],["כַּאֲשֶׁר","when"],["שָׁמְעוּ","they heard"],["אֹתוֹ","him,"],["וְאִישׁ","no man"],["לֹא","not"],["שָׁלַח","laid"],["בּוֹ","upon him"],["יָד","his hands;"],["כִּי","for"],["פַחַד","fear"],["בָּא","came"],["עַל־כׇּל־הַשֹּׁמְעִים","on all them that heard him;"],["כִּי","for"],["הִתְהַלֶּךְ","he walked"],["עִם־אֱלֹהִים","with God."],["׃",""]
  ]},
  { num: "מ", words: [
    ["וַיָּבֹא","And there came"],["אֵלָיו","unto him"],["אִישׁ","a man,"],["וּשְׁמוֹ","whose name was"],["מָחִיָּה","Mahijah,"],["וַיֹּאמֶר","and said"],["אֵלָיו","unto him:"],["הַגֶּד־נָא","Tell plainly"],["לָנוּ","unto us"],["מִי","who"],["אַתָּה","thou art,"],["וּמֵאַיִן","and from whence"],["בָּאתָ","thou comest?"],["׃",""]
  ]},
  { num: "מא", words: [
    ["וַיֹּאמֶר","And he said"],["אֲלֵיהֶם","unto them:"],["מֵאֶרֶץ","From the land of"],["קֵינָן","Cainan,"],["יָצָאתִי","came I,"],["אֶרֶץ","the land of"],["אֲבוֹתַי","my fathers,"],["אֶרֶץ","a land of"],["צֶדֶק","righteousness"],["עַד","unto"],["הַיּוֹם","day"],["הַזֶּה","this;"],["וְאָבִי","and my father"],["לִמְּדַנִי","taught me"],["בְּכׇל־דַּרְכֵי","in all the ways of"],["אֱלֹהִים","God."],["׃",""]
  ]},
  { num: "מב", words: [
    ["וַיְהִי","And it came to pass"],["כַּאֲשֶׁר","as"],["הָלַכְתִּי","I journeyed"],["מֵאֶרֶץ","from the land of"],["קֵינָן","Cainan,"],["עַל־יַד","by the way of"],["הַיָּם","the sea,"],["מִזְרָחָה","east,"],["רָאִיתִי","I beheld"],["מַרְאָה","a vision;"],["וְהִנֵּה","and lo,"],["רָאִיתִי","I beheld"],["אֶת־הַשָּׁמַיִם","the heavens;"],["וַיְדַבֵּר","and spake"],["יְהוָה","the Lord"],["עִמִּי","with me,"],["וַיִּתֶּן־לִי","and gave me"],["מִצְוָה","commandment;"],["לָכֵן","wherefore,"],["לְמַעַן","for this purpose"],["שְׁמֹר","keep"],["אֶת־הַמִּצְוָה","the commandment"],["אֲנִי","I"],["מְדַבֵּר","speak"],["אֶת־הַדְּבָרִים","words"],["הָאֵלֶּה","these."],["׃",""]
  ]},
  { num: "מג", words: [
    ["וַיּוֹסֶף","And again"],["חֲנוֹךְ","Enoch"],["לְדַבֵּר","spake"],["לֵאמֹר","saying:"],["יְהוָה","The Lord"],["אֲשֶׁר","which"],["דִּבֶּר","spake"],["עִמִּי","with me,"],["הוּא","the same"],["אֱלֹהֵי","is the God of"],["הַשָּׁמַיִם","heaven,"],["וְהוּא","and he is"],["אֱלֹהַי","my God,"],["וֵאלֹהֵיכֶם","and your God;"],["וְאַתֶּם","and ye are"],["אַחַי","my brethren,"],["וְלָמָּה","and why"],["תִּוָּעֲצוּ","counsel ye"],["בֵינֵיכֶם","yourselves,"],["וּתְכַחֲשׁוּ","and deny"],["בֵּאלֹהֵי","the God of"],["הַשָּׁמָיִם","heaven?"],["׃",""]
  ]},
  { num: "מד", words: [
    ["הַשָּׁמַיִם","The heavens"],["הוּא","he"],["עָשָׂה","made;"],["וְהָאָרֶץ","the earth is"],["הֲדֹם","a footstool"],["רַגְלָיו","of his feet;"],["וִיסוֹדָהּ","and the foundation thereof is"],["לוֹ","his."],["הִנֵּה","Behold,"],["הוּא","he"],["יְסָדָהּ","laid it,"],["וַהֲמוֹן","an host of"],["אָדָם","men"],["הֵבִיא","hath he brought"],["עַל־פָּנֶיהָ","upon the face thereof."],["׃",""]
  ]},
  { num: "מה", words: [
    ["וְהַמָּוֶת","And death"],["בָּא","hath come"],["עַל־אֲבוֹתֵינוּ","upon our fathers;"],["אַךְ","nevertheless"],["יָדַעְנוּ","we know"],["אֹתָם","them,"],["וְלֹא","and not"],["נוּכַל","can we"],["לְכַחֵשׁ","deny it,"],["וְגַם","and even"],["אֶת־הָרִאשׁוֹן","the first of"],["לְכֻלָּם","all"],["יָדַעְנוּ","we know,"],["אֶת־אָדָם","even Adam."],["׃",""]
  ]},
  { num: "מו", words: [
    ["כִּי","For"],["סֵפֶר","a book of"],["זִכָּרוֹן","remembrance"],["כָּתַבְנוּ","have we written"],["בֵינֵינוּ","among us,"],["כְּתַבְנִית","according to the pattern"],["הַנְּתוּנָה","given"],["בְּאֶצְבַּע","by the finger of"],["אֱלֹהִים","God;"],["וְהוּא","and it is"],["נָתוּן","given"],["בִּלְשׁוֹנֵנוּ","in our own language."],["׃",""]
  ]},
  { num: "מז", words: [
    ["וּכְדַבֵּר","And as spake"],["חֲנוֹךְ","Enoch"],["אֶת־דִּבְרֵי","the words of"],["אֱלֹהִים","God,"],["וַיֶּחֶרְדוּ","trembled"],["הָעָם","the people,"],["וְלֹא","and not"],["יָכְלוּ","could"],["לַעֲמֹד","stand"],["לְפָנָיו","in his presence."],["׃",""]
  ]},
  { num: "מח", words: [
    ["וַיֹּאמֶר","And he said"],["אֲלֵיהֶם","unto them:"],["יַעַן","Because that"],["נָפַל","fell"],["אָדָם","Adam,"],["אָנוּ","we are;"],["וּבִנְפִלָתוֹ","and by his fall"],["בָּא","came"],["הַמָּוֶת","death;"],["וַנַּעֲשֶׂה","and we are made"],["שֻׁתָּפִים","partakers"],["לְיָגוֹן","of misery"],["וּלְמַכְאוֹב","and woe."],["׃",""]
  ]},
  { num: "מט", words: [
    ["הִנֵּה","Behold,"],["הַשָּׂטָן","Satan"],["בָּא","hath come"],["בְּתוֹךְ","among"],["בְּנֵי","the children of"],["הָאָדָם","men,"],["וַיְנַסֵּם","and tempteth them"],["לְהִשְׁתַּחֲוֹת","to worship"],["לוֹ","him;"],["וַיִּהְיוּ","and have become"],["אֲנָשִׁים","men"],["בַּשָּׂרִיִּים","carnal,"],["חִשּׁוּקִיִּים","sensual,"],["וְשָׂטָנִיִּים","and devilish,"],["וַיִּסָּגְרוּ","and are shut out"],["מִפְּנֵי","from the presence of"],["אֱלֹהִים","God."],["׃",""]
  ]},
  { num: "נ", words: [
    ["אַךְ","But"],["הוֹדִיעַ","hath made known"],["אֱלֹהִים","God"],["לַאֲבוֹתֵינוּ","unto our fathers"],["כִּי","that"],["כׇל־הָאָדָם","all men"],["יָשׁוּבוּ","must repent."],["׃",""]
  ]},
  { num: "נא", words: [
    ["וַיִּקְרָא","And he called"],["אֶל־אָבִינוּ","upon our father"],["אָדָם","Adam"],["בְּקוֹלוֹ","by his own voice,"],["לֵאמֹר","saying:"],["אֲנִי","I am"],["אֱלֹהִים","God;"],["אֲנִי","I"],["עָשִׂיתִי","made"],["אֶת־הָעוֹלָם","the world,"],["וְאֶת־הָאָדָם","and men"],["בְּטֶרֶם","before"],["הָיוּ","that they were"],["בַבָּשָׂר","in the flesh."],["׃",""]
  ]},
  { num: "נב", words: [
    ["וְגַם","And he also"],["אָמַר","said"],["אֵלָיו","unto him:"],["אִם־תָּשׁוּב","If thou wilt turn"],["אֵלַי","unto me,"],["וְתִשְׁמַע","and hearken"],["בְּקוֹלִי","unto my voice,"],["וְתַאֲמִין","and believe,"],["וְתָשׁוּב","and repent"],["מִכׇּל־פְּשָׁעֶיךָ","of all thy transgressions,"],["וְנִטְבַּלְתָּ","and be baptized,"],["בַּמַּיִם","even in water,"],["בְּשֵׁם","in the name of"],["בְּנִי","my Only Begotten"],["יְחִידִי","Son,"],["הַמָּלֵא","who is full of"],["חֶסֶד","grace"],["וֶאֱמֶת","and truth,"],["אֲשֶׁר","which is"],["הוּא","he,"],["יֵשׁוּעַ","Jesus"],["הַמָּשִׁיחַ","Christ,"],["הַשֵּׁם","the name"],["הַיָּחִיד","the only one"],["אֲשֶׁר","which"],["יִנָּתֵן","shall be given"],["תַּחַת","under"],["הַשָּׁמַיִם","heaven,"],["אֲשֶׁר","whereby"],["בּוֹ","in it"],["תָּבֹא","shall come"],["יְשׁוּעָה","salvation"],["לִבְנֵי","unto the children of"],["הָאָדָם","men;"],["תְּקַבְּלוּ","ye shall receive"],["אֶת־מַתַּת","the gift of"],["רוּחַ","the Holy Ghost,"],["הַקֹּדֶשׁ",""],["וְשָׁאַלְתֶּם","asking"],["כֹּל","all things"],["בִּשְׁמוֹ","in his name,"],["וְכֹל","and whatsoever"],["אֲשֶׁר","which"],["תִּשְׁאֲלוּ","ye shall ask,"],["יִנָּתֵן","it shall be given"],["לָכֶם","unto you."],["׃",""]
  ]},
  { num: "נג", words: [
    ["וַיְדַבֵּר","And spake"],["אָבִינוּ","our father"],["אָדָם","Adam"],["אֶל־יְהוָה","unto the Lord,"],["וַיֹּאמַר","and said:"],["לָמָּה","Why"],["יָשׁוּבוּ","must repent"],["הָאֲנָשִׁים","men"],["וְיִטָּבְלוּ","and be baptized"],["בַמָּיִם","in water?"],["וַיֹּאמֶר","And said"],["יְהוָה","the Lord"],["אֶל־אָדָם","unto Adam:"],["הִנֵּה","Behold"],["סָלַחְתִּי","I have forgiven"],["לְךָ","thee"],["אֶת־פִּשְׁעֲךָ","thy transgression"],["בְּגַן־עֵדֶן","in the Garden of Eden."],["׃",""]
  ]},
  { num: "נד", words: [
    ["וּמֵאָז","Hence"],["יָצָא","went forth"],["הַדָּבָר","the saying"],["בָּעָם","abroad among the people,"],["לֵאמֹר","that"],["בֶּן־אֱלֹהִים","the Son of God"],["כִּפֶּר","hath atoned"],["עַל־הָאַשְׁמָה","for guilt"],["הָרִאשׁוֹנָה","original,"],["וַחֲטֹאת","wherein the sins of"],["הָאָבוֹת","the parents"],["לֹא","cannot"],["יֵעָנְשׁוּ","be answered"],["עַל־רָאשֵׁי","upon the heads of"],["הַבָּנִים","the children,"],["כִּי","for"],["שְׁלֵמִים","whole"],["הֵם","they are"],["מִיְּסוֹד","from the foundation of"],["הָעוֹלָם","the world."],["׃",""]
  ]},
  { num: "נה", words: [
    ["וַיְדַבֵּר","And spake"],["יְהוָה","the Lord"],["אֶל־אָדָם","unto Adam,"],["לֵאמֹר","saying:"],["יַעַן","Inasmuch as"],["בָּנֶיךָ","thy children"],["הֹרוּ","are conceived"],["בַחֵטְא","in sin,"],["כֵּן","even so"],["כַּאֲשֶׁר","when"],["יִגְדְּלוּ","they begin to grow up,"],["יֶהְגֶּה","conceiveth"],["הַחֵטְא","sin"],["בְּלִבָּם","in their hearts,"],["וְיִטְעֲמוּ","and they taste"],["אֶת־הַמַּר","the bitter,"],["לְמַעַן","that"],["יֵדְעוּ","they may know"],["לְהוֹקִיר","to prize"],["אֶת־הַטּוֹב","the good."],["׃",""]
  ]},
  { num: "נו", words: [
    ["וְנִתַּן","And it is given"],["לָהֶם","unto them"],["לָדַעַת","to know"],["טוֹב","good"],["וָרָע","from evil;"],["לָכֵן","wherefore"],["פֹּעֲלִים","agents"],["הֵם","they are"],["לְעַצְמָם","unto themselves,"],["וְנָתַתִּי","and I have given"],["לָכֶם","unto you"],["תּוֹרָה","a law"],["וּמִצְוָה","and a commandment"],["אַחֶרֶת","another."],["׃",""]
  ]},
  { num: "נז", words: [
    ["לָכֵן","Wherefore"],["לַמְּדוּ","teach"],["אֶת־בְּנֵיכֶם","it unto your children,"],["כִּי","that"],["כׇל־הָאָדָם","all men"],["בְּכׇל־מָקוֹם","everywhere,"],["יָשׁוּבוּ","must repent,"],["אוֹ","or"],["לֹא","not"],["יִירְשׁוּ","they can in nowise inherit"],["אֶת־מַלְכוּת","the kingdom of"],["אֱלֹהִים","God,"],["כִּי","for"],["דָבָר","no thing"],["טָמֵא","unclean"],["לֹא","not"],["יוּכַל","can"],["לָגוּר","dwell"],["שָׁם","there,"],["וְלֹא","or"],["לָגוּר","dwell"],["בִּפְנֵי","in the presence of"],["אֱלֹהִים","God;"],["כִּי","for"],["בִּלְשׁוֹן","in the language of"],["אָדָם","Adam,"],["אִישׁ","Man of"],["הַקֹּדֶשׁ","Holiness"],["הוּא","is"],["שְׁמוֹ","his name,"],["וְשֵׁם","and the name of"],["יְחִידוֹ","his Only Begotten is"],["בֶּן־הָאָדָם","the Son of Man,"],["הוּא","even"],["יֵשׁוּעַ","Jesus"],["הַמָּשִׁיחַ","Christ,"],["שׁוֹפֵט","a Judge of"],["צֶדֶק","righteousness,"],["אֲשֶׁר","who"],["יָבֹא","shall come"],["בְּאֶמְצַע","in the meridian of"],["הָעִתִּים","time."],["׃",""]
  ]},
  { num: "נח", words: [
    ["לָכֵן","Therefore"],["נֹתֵן","give"],["אֲנִי","I"],["לָכֶם","unto you"],["מִצְוָה","a commandment,"],["לְלַמֵּד","to teach"],["אֶת־הַדְּבָרִים","things"],["הָאֵלֶּה","these"],["בְּחׇפְשִׁי","freely"],["לִבְנֵיכֶם","unto your children,"],["לֵאמֹר","saying:"],["׃",""]
  ]},
  { num: "נט", words: [
    ["כִּי","That"],["בִּגְלַל","by reason of"],["הַפֶּשַׁע","transgression"],["בָּאָה","cometh"],["הַנְּפִילָה","the fall,"],["וְהַנְּפִילָה","which fall"],["מְבִיאָה","bringeth"],["אֶת־הַמָּוֶת","death,"],["וְכַאֲשֶׁר","and inasmuch as"],["נוֹלַדְתֶּם","ye were born"],["לָעוֹלָם","into the world"],["בַּמַּיִם","by water,"],["וּבַדָּם","and blood,"],["וּבָרוּחַ","and the spirit,"],["אֲשֶׁר","which"],["עָשִׂיתִי","I have made,"],["וְכֵן","and so"],["נַעֲשֵׂיתֶם","became"],["מֵעָפָר","of dust"],["לְנֶפֶשׁ","a living"],["חַיָּה","soul,"],["כֵּן","even so"],["תִּוָּלְדוּ","ye must be born"],["שֵׁנִית","again"],["לְמַלְכוּת","into the kingdom of"],["הַשָּׁמַיִם","heaven,"],["מִן־הַמַּיִם","of water,"],["וּמִן־הָרוּחַ","and of the Spirit,"],["וְתִטָּהֲרוּ","and be cleansed"],["בַדָּם","by blood,"],["בְּדַם","even the blood of"],["יְחִידִי","mine Only Begotten;"],["לְמַעַן","that"],["תִּתְקַדְּשׁוּ","ye may be sanctified"],["מִכׇּל־חֵטְא","from all sin,"],["וְתֵהָנוּ","and enjoy"],["מִדִּבְרֵי","the words of"],["חַיֵּי","life"],["עוֹלָם","eternal"],["בָּעוֹלָם","in world"],["הַזֶּה","this,"],["וְחַיֵּי","and life"],["עוֹלָם","eternal"],["בָּעוֹלָם","in the world"],["הַבָּא","to come,"],["כְּבוֹד","glory"],["אֲשֶׁר","which"],["לֹא","not"],["יָמוּת","dieth;"],["׃",""]
  ]},
  { num: "ס", words: [
    ["כִּי","For"],["בַמַּיִם","by the water"],["תִּשְׁמְרוּ","ye keep"],["אֶת־הַמִּצְוָה","the commandment;"],["בָּרוּחַ","by the Spirit"],["תִּצָּדְקוּ","ye are justified,"],["וּבַדָּם","and by the blood"],["תִּתְקַדְּשׁוּ","ye are sanctified;"],["׃",""]
  ]},
  { num: "סא", words: [
    ["לָכֵן","Therefore"],["נִתַּן","it is given"],["לָשֶׁבֶת","to abide"],["בָּכֶם","in you;"],["עֵדוּת","the record of"],["הַשָּׁמַיִם","heaven;"],["הַמְּנַחֵם","the Comforter;"],["שַׁלְוַת","the peaceable things of"],["כְּבוֹד","glory"],["אֲשֶׁר","which"],["לֹא","not"],["יָמוּת","dieth;"],["אֱמֶת","the truth of"],["כׇּל־הַדְּבָרִים","all things;"],["הַמְחַיֶּה","that which quickeneth"],["אֶת־כֹּל","all things,"],["הַיֹּדֵעַ","which maketh alive"],["כֹּל","all things;"],["וְלוֹ","that which knoweth"],["כׇל־כֹּחַ","all things,"],["כְּחׇכְמָה","and hath all power"],["וּכְחֶסֶד","according to wisdom, mercy,"],["וְכֶאֱמֶת","truth,"],["וּכְצֶדֶק","justice,"],["וּכְמִשְׁפָּט","and judgment."],["׃",""]
  ]},
  { num: "סב", words: [
    ["וְעַתָּה","And now,"],["הִנֵּה","behold,"],["אֹמֵר","I say"],["אֲנִי","I"],["לָכֶם","unto you:"],["זֹאת","This"],["הִיא","is"],["תָּכְנִית","the plan of"],["הַיְשׁוּעָה","salvation"],["לְכׇל־הָאָדָם","unto all men,"],["בְּדַם","through the blood of"],["יְחִידִי","mine Only Begotten,"],["אֲשֶׁר","who"],["יָבֹא","shall come"],["בְּאֶמְצַע","in the meridian of"],["הָעִתִּים","time."],["׃",""]
  ]},
  { num: "סג", words: [
    ["וְהִנֵּה","And behold,"],["לְכׇל־הַדְּבָרִים","all things"],["דְּמוּתָם","have their likeness,"],["וְכׇל־הַדְּבָרִים","and all things"],["נִבְרְאוּ","are created"],["וְנַעֲשׂוּ","and made"],["לְהָעִיד","to bear record of"],["עָלַי","me,"],["דְּבָרִים","things"],["זְמַנִּיִּים","temporal,"],["וְדָבָרִים","and things"],["רוּחָנִיִּים","spiritual;"],["דְּבָרִים","things"],["אֲשֶׁר","which are"],["בַּשָּׁמַיִם","in the heavens"],["מִמַּעַל","above,"],["וְדָבָרִים","and things"],["אֲשֶׁר","which are"],["עַל־הָאָרֶץ","on the earth,"],["וְדָבָרִים","and things"],["אֲשֶׁר","which are"],["בָּאָרֶץ","in the earth,"],["וְדָבָרִים","and things"],["אֲשֶׁר","which are"],["מִתַּחַת","under"],["לָאָרֶץ","the earth,"],["מִמַּעַל","both above"],["וּמִתָּחַת","and beneath:"],["כׇּל־הַדְּבָרִים","all things"],["מְעִידִים","bear record"],["עָלָי","of me."],["׃",""]
  ]},
  { num: "סד", words: [
    ["וַיְהִי","And it came to pass"],["כַּאֲשֶׁר","when"],["דִּבֶּר","spake"],["יְהוָה","the Lord"],["עִם־אָדָם","unto Adam,"],["אָבִינוּ","our father,"],["וַיִּצְעַק","cried"],["אָדָם","Adam"],["אֶל־יְהוָה","unto the Lord,"],["וַיִּלָּקַח","and he was caught away"],["בְּרוּחַ","by the Spirit of"],["יְהוָה","the Lord,"],["וַיּוּבַל","and was carried down"],["אֶל־הַמַּיִם","into the water,"],["וַיּוּשַׂם","and was laid"],["תַּחַת","under"],["הַמַּיִם","the water,"],["וַיּוּצַא","and was brought forth"],["מִן־הַמָּיִם","out of the water."],["׃",""]
  ]},
  { num: "סה", words: [
    ["וְכֵן","And thus"],["נִטְבַּל","he was baptized,"],["וַתֵּרֶד","and descended"],["רוּחַ","the Spirit of"],["אֱלֹהִים","God"],["עָלָיו","upon him,"],["וְכֵן","and thus"],["נוֹלַד","he was born"],["מִן־הָרוּחַ","of the Spirit,"],["וַיְחִי","and was quickened"],["בָּאָדָם","in the man"],["הַפְּנִימִי","inner."],["׃",""]
  ]},
  { num: "סו", words: [
    ["וַיִּשְׁמַע","And he heard"],["קוֹל","a voice"],["מִן־הַשָּׁמַיִם","from heaven,"],["לֵאמֹר","saying:"],["נִטְבַּלְתָּ","Thou art baptized"],["בָּאֵשׁ","with fire,"],["וּבְרוּחַ","and with the Holy Ghost."],["הַקֹּדֶשׁ",""],["זֹאת","This is"],["עֵדוּת","the record of"],["הָאָב","the Father,"],["וְהַבֵּן","and the Son,"],["מֵעַתָּה","from henceforth"],["וְעַד־עוֹלָם","and forever;"],["׃",""]
  ]},
  { num: "סז", words: [
    ["וְאַתָּה","And thou art"],["כְּסֵדֶר","after the order of"],["אֲשֶׁר","him"],["אֵין","who was"],["לוֹ","without"],["רֵאשִׁית","beginning of"],["יָמִים","days"],["וְאֵין","or"],["קֵץ","end of"],["שָׁנִים","years,"],["מֵעוֹלָם","from all eternity"],["וְעַד־עוֹלָם","to all eternity."],["׃",""]
  ]},
  { num: "סח", words: [
    ["הִנֵּה","Behold,"],["אַתָּה","thou art"],["אֶחָד","one"],["בִּי","in me,"],["בֶּן־אֱלֹהִים","a son of God;"],["וְכֵן","and thus"],["יוּכְלוּ","may"],["כֻלָּם","all"],["לִהְיוֹת","become"],["בָּנָי","my sons."],["אָמֵן","Amen."],["׃",""]
  ]}
];
renderVerseSet(ms_ch6Verses, 'ms-ch6-verses');
var ms_ch7Verses = [
  { num: "א", words: [
    ["וַיֹּסֶף","And went on"],["חֲנוֹךְ","Enoch"],["לְדַבֵּר","to speak,"],["וַיֹּאמַר","saying:"],["הִנֵּה","Behold,"],["לִמֵּד","taught"],["אָבִינוּ","our father"],["אָדָם","Adam"],["דְּבָרִים","things"],["אֵלֶּה","these,"],["וַיַּאֲמִינוּ","and believed"],["רַבִּים","many,"],["וַיִּהְיוּ","and became"],["בְנֵי","the sons of"],["אֱלֹהִים","God,"],["וְרַבִּים","and many"],["לֹא","not"],["הֶאֱמִינוּ","believed,"],["וַיֹּאבְדוּ","and perished"],["בְחַטֹּאתָם","in their sins,"],["וְצֹפִים","and look forward"],["בְּפַחַד","with fear,"],["וּבְעִנּוּי","in torment,"],["לִפְנֵי","unto"],["זַעַם","the indignation of"],["אֵשׁ","the fiery"],["חֲרוֹן","fierce"],["יְהוָה","of the Lord"],["הַנִּשְׁפָּךְ","which shall be poured out"],["עֲלֵיהֶם","upon them."],["׃",""]
  ]},
  { num: "ב", words: [
    ["וּמֵאָז","And from that time forth"],["הֵחֵל","began"],["חֲנוֹךְ","Enoch"],["הִתְנַבֵּא","to prophesy,"],["וַיֹּאמֶר","saying"],["אֶל־הָעָם","unto the people:"],["כַּאֲשֶׁר","As"],["הָלַכְתִּי","I journeyed,"],["וָאֶעֱמֹד","and stood"],["עַל־מָחוּיָה","upon the place Mahujah,"],["וָאֶקְרָא","and cried"],["אֶל־יְהוָה","unto the Lord,"],["בָּא","there came"],["קוֹל","a voice"],["מִן־הַשָּׁמַיִם","out of heaven,"],["לֵאמֹר","saying:"],["פְּנוּ","Turn ye,"],["וַעֲלוּ","and get ye"],["אֶל־הַר","upon the mount"],["שִׁמְעוֹן","Simeon."],["׃",""]
  ]},
  { num: "ג", words: [
    ["וָאֵפֶן","And I turned"],["וָאַעַל","and went up"],["אֶל־הָהָר","on the mount;"],["וַיְהִי","and as I stood"],["עַל־הָהָר","upon the mount,"],["וָאֵרֶא","I beheld"],["אֶת־הַשָּׁמַיִם","the heavens"],["נִפְתָּחִים","open,"],["וָאֶלְבַּשׁ","and I was clothed upon with"],["הוֹד","glory."],["׃",""]
  ]},
  { num: "ד", words: [
    ["וָאֵרֶא","And I saw"],["אֶת־יְהוָה","the Lord;"],["וַיַּעֲמֹד","and he stood"],["לְפָנַי","before my face,"],["וַיְדַבֵּר","and he talked"],["עִמִּי","with me,"],["כַּאֲשֶׁר","even as"],["יְדַבֵּר","talketh"],["אִישׁ","a man"],["אֶל־רֵעֵהוּ","with another,"],["פָּנִים","face"],["אֶל־פָּנִים","to face;"],["וַיֹּאמֶר","and he said"],["אֵלַי","unto me:"],["הַבֵּט","Look,"],["וְאַרְאֶךָּ","and I will show thee"],["אֶת־הָעוֹלָם","the world"],["לְדֹרֹתָיו","for the space of many generations."],["׃",""]
  ]},
  { num: "ה", words: [
    ["וָאַבֵּט","And I looked"],["אֶל־עֵמֶק","upon the valley of"],["שׁוּם","Shum,"],["וְהִנֵּה","and behold,"],["עַם","a people"],["רַב","great"],["יֹשֵׁב","dwelt in"],["אֹהָלִים","tents,"],["עַם","the people of"],["שׁוּם","Shum."],["׃",""]
  ]},
  { num: "ו", words: [
    ["וַיֹּאמֶר","And said"],["יְהוָה","the Lord"],["אֵלַי","unto me:"],["עוֹד","Again,"],["הַבֵּט","Look,"],["וָאַבֵּט","and I looked"],["צָפוֹנָה","towards the north,"],["וָאֵרֶא","and I beheld"],["עַם","the people of"],["כְּנָעַן","Canaan,"],["יֹשְׁבֵי","dwelling in"],["אֹהָלִים","tents."],["׃",""]
  ]},
  { num: "ז", words: [
    ["וַיֹּאמֶר","And said"],["יְהוָה","the Lord"],["אֵלַי","unto me:"],["הִנָּבֵא","Prophesy;"],["וָאֶתְנַבֵּא","and I prophesied,"],["לֵאמֹר","saying:"],["הִנֵּה","Behold,"],["יֵצֵא","shall go forth"],["עַם","the people of"],["כְּנָעַן","Canaan,"],["הָרַב","which are numerous,"],["בְּמַעֲרָכָה","in battle array"],["עַל־עַם","against the people of"],["שׁוּם","Shum,"],["וְהִכָּם","and shall slay them"],["עַד־כַּלֵּה","utterly,"],["וְהִתְחַלֵּק","and they shall be divided"],["בָּאָרֶץ","in the land;"],["וְהָאָרֶץ","and the land"],["תִּהְיֶה","shall be"],["שְׁמָמָה","barren"],["וְלֹא","and not"],["פֹרִיָּה","fruitful,"],["וְלֹא","and not"],["יֵשֵׁב","shall dwell"],["בָּהּ","in it"],["עַם","any people"],["זוּלָתִי","save"],["עַם","the people of"],["כְּנָעַן","Canaan;"],["׃",""]
  ]},
  { num: "ח", words: [
    ["כִּי","For"],["יְקַלֵּל","shall curse"],["יְהוָה","the Lord"],["אֶת־הָאָרֶץ","the land"],["בְּחֹם","with much"],["רַב","heat,"],["וּשְׁמָמָתָהּ","and the barrenness thereof"],["תֵּצֵא","shall go forth"],["לְדֹרֹתָם","for ever;"],["וַיְהִי","and there was"],["שַׁחֲרוּת","a blackness"],["עַל־בְּנֵי","upon the children of"],["כְנָעַן","Canaan,"],["וַיִּהְיוּ","and they were"],["לְבוּז","despised"],["בְּכׇל־הָעַמִּים","among all people."],["׃",""]
  ]},
  { num: "ט", words: [
    ["וַיֹּאמֶר","And said"],["יְהוָה","the Lord"],["אֵלַי","unto me:"],["הַבֵּט","Look;"],["וָאַבֵּט","and I looked,"],["וָאֵרֶא","and beheld"],["אֶרֶץ","the land of"],["שָׁרוֹן","Sharon,"],["וְאֶרֶץ","and the land of"],["חֲנוֹךְ","Enoch,"],["וְאֶרֶץ","and the land of"],["אָמְנֵר","Omner,"],["וְאֶרֶץ","and the land of"],["חֵנִי","Heni,"],["וְאֶרֶץ","and the land of"],["שֵׁם","Shem,"],["וְאֶרֶץ","and the land of"],["וְאֶרֶץ","the land of"],["חֲנַנִּיָּה","Hanannihah,"],["וְאֶת־כׇּל־יֹשְׁבֵיהֶן","and all the inhabitants thereof."],["׃",""]
  ]},
  { num: "י", words: [
    ["וַיֹּאמֶר","And said"],["יְהוָה","the Lord"],["אֵלַי","unto me:"],["לֵךְ","Go"],["אֶל־הָעָם","to people"],["הַזֶּה","this,"],["וְאָמַרְתָּ","and say"],["שׁוּבוּ","unto them—Repent,"],["פֶּן־אֵצֵא","lest I come out"],["וְהִכֵּיתִי","and smite"],["אֶתְכֶם","them"],["בַּקְּלָלָה","with a curse,"],["וּמַתֶּם","and they die."],["׃",""]
  ]},
  { num: "יא", words: [
    ["וַיִּתֶּן־לִי","And he gave unto me"],["מִצְוָה","a commandment"],["לְהַטְבִּיל","that I should baptize"],["בְּשֵׁם","in the name of"],["הָאָב","the Father,"],["וּבְשֵׁם","and of"],["הַבֵּן","the Son,"],["מְלֹא","who is full of"],["חֶסֶד","grace"],["וֶאֱמֶת","and truth,"],["וּבְשֵׁם","and of"],["רוּחַ","the Holy Ghost,"],["הַקֹּדֶשׁ",""],["הַמֵּעִידָה","which beareth record of"],["בָאָב","the Father"],["וּבַבֵּן","and the Son."],["׃",""]
  ]},
  { num: "יב", words: [
    ["וַיֹּסֶף","And continued"],["חֲנוֹךְ","Enoch"],["לִקְרֹא","to call"],["אֶל־כׇּל־הָעָם","upon all the people,"],["לָשׁוּב","to repent,"],["לְבַד","save it were"],["מֵעַם","the people of"],["כְּנָעַן","Canaan."],["׃",""]
  ]},
  { num: "יג", words: [
    ["וְכֹה","And so"],["גָדְלָה","great was"],["אֱמוּנַת","the faith of"],["חֲנוֹךְ","Enoch"],["וַיַּנְחֶה","that he led"],["עַם","the people of"],["אֱלֹהִים","God,"],["וַיָּבֹאוּ","and came"],["אֹיְבֵיהֶם","their enemies"],["לְהִלָּחֵם","to battle"],["בָּם","against them;"],["וַיְדַבֵּר","and he spake"],["דְּבַר","the word of"],["יְהוָה","the Lord,"],["וַתִּרְעַשׁ","and quaked"],["הָאָרֶץ","the earth,"],["וַיָּנוּסוּ","and fled"],["הֶהָרִים","the mountains,"],["כְּמִצְוָתוֹ","according to his command;"],["וַיִּסֹּבּוּ","and turned"],["נַהֲרוֹת","the rivers"],["מִמְּסִלָּתָם","out of their course;"],["וַתִּשָּׁמַע","and was heard"],["שַׁאֲגַת","the roar of"],["אֲרָיוֹת","the lions"],["מִן־הַמִּדְבָּר","out of the wilderness;"],["וַיִּירְאוּ","and feared"],["כׇל־הַגּוֹיִם","all nations"],["מְאֹד","greatly,"],["וְכֹה","so"],["גָדְלָה","powerful was"],["גְּבוּרַת","the strength of"],["דְּבָרוֹ","the word of him"],["אֲשֶׁר","which"],["נָתַן־לוֹ","gave"],["אֱלֹהִים","God."],["׃",""]
  ]},
  { num: "יד", words: [
    ["וְעָלְתָה","And there also came up"],["אֶרֶץ","a land"],["מִמַּעֲמַקֵּי","out of the depth of"],["הַיָּם","the sea,"],["וַיִּגְדַּל","and was great"],["פַּחַד","the fear of"],["אֹיְבֵי","the enemies of"],["עַם","the people of"],["אֱלֹהִים","God,"],["וַיָּנוּסוּ","and they fled"],["וַיַּעַמְדוּ","and stood"],["מֵרָחוֹק","afar off,"],["וַיֵּלְכוּ","and went"],["עַל־הָאָרֶץ","upon the land"],["הָעֹלָה","which came up"],["מִמַּעֲמַקֵּי","out of the depth of"],["הַיָּם","the sea."],["׃",""]
  ]},
  { num: "טו", words: [
    ["וְגַם","And also"],["הַנְּפִילִים","the giants of"],["בָּאָרֶץ","the land,"],["עָמְדוּ","stood"],["מֵרָחוֹק","afar off;"],["וַתֵּצֵא","and there went forth"],["קְלָלָה","a curse"],["עַל־כׇּל־הָעָם","upon all people"],["הַנִּלְחָמִים","that fought"],["בֵּאלֹהִים","against God;"],["׃",""]
  ]},
  { num: "טז", words: [
    ["וּמֵאָז","And from that time forth"],["הָיוּ","there were"],["מִלְחָמוֹת","wars"],["וּשְׁפִיכוּת","and shedding of"],["דָּמִים","blood"],["בֵּינֵיהֶם","among them;"],["אַךְ","but"],["בָּא","came"],["יְהוָה","the Lord"],["וַיִּשְׁכֹּן","and dwelt"],["עִם־עַמּוֹ","with his people,"],["וַיֵּשְׁבוּ","and they dwelt"],["בְצֶדֶק","in righteousness."],["׃",""]
  ]},
  { num: "יז", words: [
    ["וַיְהִי","And was"],["פַחַד","the fear of"],["יְהוָה","the Lord"],["עַל־כׇּל־הַגּוֹיִם","upon all nations,"],["מִכְּבוֹד","so great the glory of"],["יְהוָה","the Lord,"],["אֲשֶׁר","which"],["הָיָה","was"],["עַל־עַמּוֹ","upon his people."],["וַיְבָרֶךְ","And blessed"],["יְהוָה","the Lord"],["אֶת־הָאָרֶץ","the land,"],["וַיְבֹרְכוּ","and they were blessed"],["עַל־הֶהָרִים","upon the mountains,"],["וְעַל־בָּמוֹת","and upon the high places,"],["וַיִּפְרָחוּ","and did flourish."],["׃",""]
  ]},
  { num: "יח", words: [
    ["וַיִּקְרָא","And called"],["יְהוָה","the Lord"],["לְעַמּוֹ","his people"],["צִיּוֹן","Zion,"],["כִּי","because"],["הָיוּ","they were"],["לֵב","of heart"],["אֶחָד","one"],["וָנֶפֶשׁ","and of mind"],["אַחַת","one,"],["וַיֵּשְׁבוּ","and dwelt"],["בְצֶדֶק","in righteousness;"],["וְלֹא","and not"],["הָיָה","there was"],["עָנִי","poor"],["בֵּינֵיהֶם","among them."],["׃",""]
  ]},
  { num: "יט", words: [
    ["וַיֹּסֶף","And went on"],["חֲנוֹךְ","Enoch"],["לְהַטִּיף","preaching"],["צֶדֶק","righteousness"],["לְעַם","unto the people of"],["אֱלֹהִים","God."],["וַיְהִי","And it came to pass"],["בְיָמָיו","in his days,"],["בָּנָה","that he built"],["עִיר","a city"],["וַיִּקְרָא","that was called"],["לָהּ","unto her"],["עִיר","the City of"],["הַקֹּדֶשׁ","Holiness,"],["צִיּוֹן","even Zion."],["׃",""]
  ]},
  { num: "כ", words: [
    ["וַיְדַבֵּר","And talked"],["חֲנוֹךְ","Enoch"],["עִם־יְהוָה","with the Lord;"],["וַיֹּאמֶר","and he said"],["אֶל־יְהוָה","unto the Lord:"],["אָכֵן","Surely"],["תִּשְׁכֹּן","shall dwell"],["צִיּוֹן","Zion"],["לָבֶטַח","in safety"],["לְעוֹלָם","for ever."],["וַיֹּאמֶר","And said"],["יְהוָה","the Lord"],["אֶל־חֲנוֹךְ","unto Enoch:"],["בֵּרַכְתִּי","I have blessed"],["צִיּוֹן","Zion"],["וְקִלַּלְתִּי","but I have cursed"],["שְׁאָר","the residue of"],["הָעָם","the people."],["׃",""]
  ]},
  { num: "כא", words: [
    ["וַיַּרְא","And showed"],["יְהוָה","the Lord"],["חֲנוֹךְ","unto Enoch"],["אֶת־כׇּל־יֹשְׁבֵי","all the inhabitants of"],["הָאָרֶץ","the earth;"],["וַיַּבֵּט","and he beheld,"],["וְהִנֵּה","and lo,"],["צִיּוֹן","Zion,"],["בִּמְרוּצַת","in process of"],["הַיָּמִים","time,"],["נִלְקְחָה","was taken up"],["הַשָּׁמָיְמָה","into heaven."],["וַיֹּאמֶר","And said"],["יְהוָה","the Lord"],["אֶל־חֲנוֹךְ","unto Enoch:"],["הִנֵּה","Behold"],["מִשְׁכָּנִי","mine abode"],["לָעַד","for ever."],["׃",""]
  ]},
  { num: "כב", words: [
    ["וַיַּרְא","And beheld"],["חֲנוֹךְ","Enoch"],["גַּם","also"],["שְׁאָר","the residue of"],["הָעָם","the people"],["בְּנֵי","which were the sons of"],["אָדָם","Adam;"],["וַיִּהְיוּ","and they were"],["מְעֹרָבִים","a mixture of"],["בְּכׇל־זֶרַע","all the seed of"],["אָדָם","Adam"],["זוּלָתִי","save it was"],["זֶרַע","the seed of"],["קַיִן","Cain,"],["כִּי","for"],["זֶרַע","the seed of"],["קַיִן","Cain"],["שְׁחֹרִים","black"],["הָיוּ","they were,"],["וְלֹא","and not"],["הָיָה","there was"],["לָהֶם","unto them"],["מָקוֹם","a place"],["בֵּינֵיהֶם","for them."],["׃",""]
  ]},
  { num: "כג", words: [
    ["וְאַחֲרֵי","And after that"],["הִלָּקַח","was taken up"],["צִיּוֹן","Zion"],["הַשָּׁמַיְמָה","into heaven,"],["הִבִּיט","beheld"],["חֲנוֹךְ","Enoch,"],["וְהִנֵּה","and behold,"],["כׇּל־גּוֹיֵי","all the nations of"],["הָאָרֶץ","the earth"],["לְפָנָיו","were before him;"],["׃",""]
  ]},
  { num: "כד", words: [
    ["וַיָּבֹא","And there came"],["דוֹר","generation"],["אַחַר","upon"],["דּוֹר","generation;"],["וְחֲנוֹךְ","and Enoch"],["נִשָּׂא","was lifted up,"],["רָם","high,"],["בְּחֵיק","even in the bosom of"],["הָאָב","the Father,"],["וּבֶן־הָאָדָם","and of the Son of Man;"],["וְהִנֵּה","and behold,"],["כֹּחַ","the power of"],["הַשָּׂטָן","Satan was"],["עַל־כׇּל־פְּנֵי","upon all the face of"],["הָאָרֶץ","the earth."],["׃",""]
  ]},
  { num: "כה", words: [
    ["וַיַּרְא","And he saw"],["מַלְאָכִים","angels"],["יֹרְדִים","descending"],["מִן־הַשָּׁמַיִם","out of heaven;"],["וַיִּשְׁמַע","and he heard"],["קוֹל","a voice"],["גָּדוֹל","loud,"],["לֵאמֹר","saying:"],["הוֹי","Wo,"],["הוֹי","wo"],["לְיֹשְׁבֵי","be unto the inhabitants of"],["הָאָרֶץ","the earth."],["׃",""]
  ]},
  { num: "כו", words: [
    ["וַיַּרְא","And he beheld"],["אֶת־הַשָּׂטָן","Satan;"],["וְשַׁלְשֶׁלֶת","and a chain"],["גְּדוֹלָה","great"],["בְּיָדוֹ","in his hand,"],["וַיְכַס","and it veiled"],["פְּנֵי","the face of"],["כׇל־הָאָרֶץ","the whole earth"],["בְּחֹשֶׁךְ","with darkness;"],["וַיִּשָּׂא","and he lifted up"],["עֵינָיו","his eyes,"],["וַיִּצְחַק","and laughed,"],["וּמַלְאָכָיו","and his angels"],["שָׂמֵחוּ","rejoiced."],["׃",""]
  ]},
  { num: "כז", words: [
    ["וַיַּרְא","And saw"],["חֲנוֹךְ","Enoch"],["מַלְאָכִים","angels"],["יֹרְדִים","descending"],["מִן־הַשָּׁמַיִם","out of heaven,"],["מְעִידִים","bearing testimony of"],["בָּאָב","the Father"],["וּבַבֵּן","and the Son;"],["וְרוּחַ","and the Holy Ghost"],["הַקֹּדֶשׁ",""],["נָפְלָה","fell"],["עַל־רַבִּים","on many,"],["וַיִּלָּקְחוּ","and they were caught up"],["בִּגְבוּרוֹת","by the powers of"],["הַשָּׁמַיִם","heaven"],["אֶל־צִיּוֹן","into Zion."],["׃",""]
  ]},
  { num: "כח", words: [
    ["וַיַּבֵּט","And looked"],["אֱלֹהֵי","the God of"],["הַשָּׁמַיִם","heaven"],["אֶל־שְׁאָר","upon the residue of"],["הָעָם","the people,"],["וַיֵּבְךְּ","and he wept;"],["וַיָּעַד","and testified"],["חֲנוֹךְ","Enoch"],["עַל־זֹאת","of it,"],["לֵאמֹר","saying:"],["אֵיךְ","How is it that"],["בּוֹכִים","can weep"],["הַשָּׁמַיִם","the heavens,"],["וְשֹׁפְכִים","and shed forth"],["דִּמְעוֹתֵיהֶם","their tears"],["כַּמָּטָר","as the rain"],["עַל־הֶהָרִים","upon the mountains?"],["׃",""]
  ]},
  { num: "כט", words: [
    ["וַיֹּאמֶר","And said"],["חֲנוֹךְ","Enoch"],["אֶל־יְהוָה","unto the Lord:"],["אֵיךְ","How is it that"],["תּוּכַל","thou canst"],["לִבְכּוֹת","weep,"],["וְאַתָּה","seeing thou art"],["קָדוֹשׁ","holy,"],["מֵעוֹלָם","and from all eternity"],["וְעַד־עוֹלָם","to all eternity?"],["׃",""]
  ]},
  { num: "ל", words: [
    ["וְלוּ","And were it possible that"],["יָכֹל","could"],["אָדָם","man"],["לִמְנוֹת","number"],["חֶלְקֵי","the particles of"],["הָאָרֶץ","the earth,"],["וְאֶלֶף","yea, of thousand"],["אֲלָפִים","thousands"],["אֲרָצוֹת","earths"],["כָּאֵלֶּה","like this,"],["לֹא","not"],["יִהְיֶה","it would be"],["רֵאשִׁית","a beginning to"],["מִסְפַּר","the number of"],["מַעֲשֶׂיךָ","thy creations;"],["וְעוֹד","and yet"],["יְרִיעוֹתֶיךָ","thy curtains"],["נְטוּיוֹת","are stretched out still,"],["וְאַתָּה","and yet thou art"],["שָׁם","there,"],["וְחֵיקְךָ","and thy bosom is"],["שָׁם","there;"],["וְגַם","and also"],["צַדִּיק","just;"],["אַתָּה","thou art"],["רַחוּם","merciful"],["וְחַנּוּן","and kind"],["לָעַד","for ever."],["׃",""]
  ]},
  { num: "לא", words: [
    ["וְלָקַחְתָּ","And thou hast taken"],["צִיּוֹן","Zion"],["לְחֵיקְךָ","to thine own bosom,"],["מִכׇּל־מַעֲשֶׂיךָ","from all thy creations,"],["מֵעוֹלָם","from all eternity"],["וְעַד־עוֹלָם","to all eternity;"],["וְרַק","and naught but"],["שָׁלוֹם","peace,"],["וּמִשְׁפָּט","justice,"],["וֶאֱמֶת","and truth is"],["מְכוֹן","the habitation of"],["כִּסְאֶךָ","thy throne;"],["וְחֶסֶד","and mercy"],["יֵלֵךְ","shall go"],["לְפָנֶיךָ","before thy face,"],["וְאֵיךְ","and have no end—how is it"],["תּוּכַל","thou canst"],["לִבְכּוֹת","weep?"],["׃",""]
  ]},
  { num: "לב", words: [
    ["וַיֹּאמֶר","And said"],["יְהוָה","the Lord"],["אֶל־חֲנוֹךְ","unto Enoch:"],["הַבֵּט","Behold"],["אֶל־אַחֶיךָ","unto thy brethren;"],["אֵלֶּה","these"],["מַעֲשֵׂה","are the workmanship of"],["יָדַי","mine own hands,"],["וְנָתַתִּי","and I gave"],["לָהֶם","unto them"],["דַּעַת","their knowledge"],["בְּיוֹם","in the day"],["בְּרָאתִים","I created them;"],["וּבְגַן־עֵדֶן","and in the Garden of Eden,"],["נָתַתִּי","gave I"],["לָאָדָם","unto man"],["בְּחִירָתוֹ","his agency;"],["׃",""]
  ]},
  { num: "לג", words: [
    ["וְאֶל־אַחֶיךָ","And unto thy brethren"],["אָמַרְתִּי","have I said,"],["וְגַם","and also"],["צִוִּיתִי","gave commandment,"],["יֶאֱהֲבוּ","that they should love"],["אִישׁ","one"],["אָחִיו","another,"],["וְיִבְחֲרוּ","and that they should choose"],["בִי","me,"],["אֲבִיהֶם","their Father;"],["אַךְ","but"],["אֵין","there is no"],["אַהֲבָה","affection"],["בָּם","in them,"],["וְשֹׂנְאִים","and they hate"],["בְּשָׂרָם","their own blood;"],["׃",""]
  ]},
  { num: "לד", words: [
    ["וְאֵשׁ","And the fire of"],["זַעְמִי","mine indignation"],["בָּעֲרָה","is kindled"],["בָם","against them;"],["וּבַחֲמָתִי","and in my hot displeasure"],["אֲשַׁלַּח","will I send in"],["מַבּוּל","the floods"],["עֲלֵיהֶם","upon them,"],["כִּי","for"],["בָעַר","is kindled"],["חֲרוֹן","fierce"],["אַפִּי","my wrath"],["בָּם","against them."],["׃",""]
  ]},
  { num: "לה", words: [
    ["הִנֵּה","Behold,"],["אָנֹכִי","I am"],["אֱלֹהִים","God;"],["אִישׁ־קֹדֶשׁ","Man of Holiness"],["נֶצַח","Endless"],["שְׁמִי,","is my name;"],["יֹעֵץ","Counsellor"],["שְׁמִי","is my name,"],["וָעֶד","and Eternal"],["שְׁמִי","is my name."],["׃",""]
  ]},
  { num: "לו", words: [
    ["לָכֵן","Wherefore,"],["אוּכַל","I can"],["לִפְרֹשׂ","stretch forth"],["יָדַי","mine hands"],["וּלְהַחֲזִיק","and hold"],["כׇּל־מַעֲשַׂי","all the creations"],["אֲשֶׁר","which"],["עָשִׂיתִי","I have made;"],["וְעֵינִי","and mine eye"],["תּוּכַל","can"],["לִנְקֹב","pierce"],["בָּם","into them,"],["וּבְכׇל־מַעֲשֵׂה","and among all the workmanship of"],["יָדַי","mine hands"],["לֹא","not"],["הָיְתָה","there has been"],["רִשְׁעָה","wickedness"],["גְּדוֹלָה","great"],["כָּזֹאת","like this,"],["כְּבֵין","as among"],["אַחֶיךָ","thy brethren."],["׃",""]
  ]},
  { num: "לז", words: [
    ["אַךְ","But behold,"],["חַטֹּאתָם","their sins shall be"],["עַל־רָאשֵׁי","upon the heads of"],["אֲבוֹתָם","their fathers;"],["וְהַשָּׂטָן","Satan"],["יִהְיֶה","shall be"],["אֲבִיהֶם","their father,"],["וְאֻמְלָלִים","and misery"],["יִהְיוּ","shall be their doom;"],["וְכׇל־הַשָּׁמַיִם","and the whole heavens"],["יִבְכּוּ","shall weep"],["עֲלֵיהֶם","over them,"],["כׇּל־מַעֲשֵׂה","even all the workmanship of"],["יָדָי","mine hands;"],["לָכֵן","wherefore"],["הֲלֹא","should not"],["יִבְכּוּ","weep"],["הַשָּׁמַיִם","the heavens,"],["וְאֵלֶּה","seeing these"],["יְעֻנּוּ","shall suffer?"],["׃",""]
  ]},
  { num: "לח", words: [
    ["אַךְ","But behold,"],["אֲשֶׁר","these"],["עֵינֶיךָ","which thine eyes"],["רֹאוֹת","are upon"],["יֹאבְדוּ","shall perish"],["בַּמַּבּוּל","in the floods;"],["וְסָגַרְתִּים","and behold, I will shut them up;"],["בֵּית","a house of"],["כֶּלֶא","confinement"],["הֲכִינוֹתִי","have I prepared for them."],["׃",""]
  ]},
  { num: "לט", words: [
    ["וַאֲשֶׁר","And That"],["בָּחַרְתִּי","whom I have chosen"],["יִתְחַנֵּן","hath pleaded"],["לְפָנַי","before my face."],["וְיִסְבֹּל","And he shall suffer"],["בְּעַד","for"],["חַטֹּאתָם","their sins;"],["עַד־יָשׁוּבוּ","inasmuch as they will repent"],["בְּיוֹם","in the day that"],["שׁוּב","shall come"],["בְּחִירִי","my Chosen"],["אֵלַי","unto me,"],["וְעַד","and until"],["הַיּוֹם","day"],["הַהוּא","that"],["יִהְיוּ","they shall be in torment;"],["׃",""]
  ]},
  { num: "מ", words: [
    ["לָכֵן","Wherefore,"],["בִּגְלַל","because of"],["זֹאת","this,"],["יִבְכּוּ","shall weep"],["הַשָּׁמַיִם","the heavens,"],["וְכׇל־מַעֲשֵׂה","yea, and all the workmanship of"],["יָדָי","mine hands."],["׃",""]
  ]},
  { num: "מא", words: [
    ["וַיְדַבֵּר","And spake"],["יְהוָה","the Lord"],["אֶל־חֲנוֹךְ","unto Enoch,"],["וַיַּגֶּד־לוֹ","and told him"],["כׇּל־מַעֲשֵׂה","all the doings of"],["בְנֵי","the children of"],["הָאָדָם","men;"],["וַיֵּדַע","wherefore knew"],["חֲנוֹךְ","Enoch,"],["וַיַּבֵּט","and looked"],["אֶל־רִשְׁעָתָם","upon their wickedness,"],["וְאֶל־עׇנְיָם","and their misery,"],["וַיֵּבְךְּ","and wept,"],["וַיִּפְרֹשׂ","and stretched forth"],["יָדָיו","his arms,"],["וְלִבּוֹ","and his heart"],["הִתְרַחֵב","swelled wide"],["כָּעוֹלָם","as eternity;"],["וּמֵעָיו","and his bowels"],["נִכְמָרוּ","yearned;"],["וְכׇל־הָעוֹלָם","and all eternity"],["נִזְדַּעֲזֵעַ","shook."],["׃",""]
  ]},
  { num: "מב", words: [
    ["וַיַּרְא","And saw"],["חֲנוֹךְ","Enoch"],["גַּם","also"],["נֹחַ","Noah,"],["וּמִשְׁפַּחְתּוֹ","and his family;"],["כִּי","that"],["זֶרַע","the posterity of"],["כׇּל־בְּנֵי","all the sons of"],["נֹחַ","Noah"],["יִוָּשַׁע","should be saved"],["תְּשׁוּעָה","with a salvation"],["לְעֵת","for a time;"],["׃",""]
  ]},
  { num: "מג", words: [
    ["וַיִּרְאֶה","Wherefore saw"],["חֲנוֹךְ","Enoch"],["כִּי","that"],["בָנָה","builded"],["נֹחַ","Noah"],["תֵּבָה","an ark;"],["וַיְחַיֵּךְ","and smiled"],["יְהוָה","the Lord"],["עָלֶיהָ","upon it,"],["וַיַּחֲזִיקֶהָ","and held it"],["בְיָדוֹ","in his own hand;"],["אַךְ","but"],["עַל־שְׁאָר","upon the residue of"],["הָרְשָׁעִים","the wicked"],["בָּא","came"],["הַמַּבּוּל","the floods"],["וַיִּבְלָעֵם","and swallowed them up."],["׃",""]
  ]},
  { num: "מד", words: [
    ["וַיַּרְא","And as saw"],["חֲנוֹךְ","Enoch"],["אֶת־זֹאת","this,"],["וַתִּמְרַר","he had bitterness of"],["נַפְשׁוֹ","soul,"],["וַיֵּבְךְּ","and wept"],["עַל־אֶחָיו","over his brethren,"],["וַיֹּאמֶר","and said"],["אֶל־הַשָּׁמַיִם","unto the heavens:"],["לֹא","I will not"],["אֹבֶה","consent"],["לְהִנָּחֵם","to be comforted;"],["אַךְ","but"],["אָמַר","said"],["יְהוָה","the Lord"],["אֶל־חֲנוֹךְ","unto Enoch:"],["הָרֵם","Lift up"],["לִבְּךָ","thy heart,"],["וּשְׂמַח","and be glad;"],["וְהַבֵּט","and look."],["׃",""]
  ]},
  { num: "מה", words: [
    ["וַיַּבֵּט","And looked"],["חֲנוֹךְ","Enoch,"],["וּמִנֹּחַ","and from Noah"],["רָאָה","he beheld"],["כׇּל־מִשְׁפְּחוֹת","all the families of"],["הָאָרֶץ","the earth;"],["וַיִּצְעַק","and he cried"],["אֶל־יְהוָה","unto the Lord,"],["לֵאמֹר","saying:"],["מָתַי","When"],["יָבֹא","shall come"],["יוֹם","the day of"],["יְהוָה","the Lord?"],["מָתַי","When"],["יִשָּׁפֵךְ","shall be shed"],["דַּם","the blood of"],["הַצַּדִּיק","the Righteous,"],["לְמַעַן","that"],["יִתְקַדְּשׁוּ","may be sanctified"],["כׇל־הָאֲבֵלִים","all they that mourn"],["וְיִחְיוּ","and may have life"],["חַיֵּי","of"],["עַד","eternity?"],["׃",""]
  ]},
  { num: "מו", words: [
    ["וַיֹּאמֶר","And said"],["יְהוָה","the Lord:"],["בְּקֶרֶב","It shall be in the meridian of"],["הַיָּמִים","time,"],["בִּימֵי","in the days of"],["רֶשַׁע","wickedness"],["וְנָקָם","and vengeance."],["׃",""]
  ]},
  { num: "מז", words: [
    ["וַיַּרְא","And beheld"],["חֲנוֹךְ","Enoch"],["יוֹם","the day of"],["בּוֹא","the coming of"],["בֶּן־הָאָדָם","the Son of Man,"],["בַּבָּשָׂר","even in the flesh;"],["וַתָּגֶל","and rejoiced"],["נַפְשׁוֹ","his soul,"],["לֵאמֹר","saying:"],["נִשָּׂא","is lifted up,"],["הַצַּדִּיק","The Righteous"],["וְהַשֶּׂה","and the Lamb is"],["טָבוּחַ","slain"],["מִיְּסוֹד","from the foundation of"],["הָעוֹלָם","the world;"],["וּבֶאֱמוּנָה","and through faith"],["בְּחֵיק","I am in the bosom of"],["הָאָב","the Father,"],["וְצִיּוֹן","and behold, Zion is"],["עִמִּי","with me."],["׃",""]
  ]},
  { num: "מח", words: [
    ["וַיַּבֵּט","And looked"],["חֲנוֹךְ","Enoch"],["אֶל־הָאָרֶץ","upon the earth;"],["וַיִּשְׁמַע","and he heard"],["קוֹל","a voice"],["מִמֵּעֶיהָ","from the bowels thereof,"],["לֵאמֹר","saying:"],["הוֹי","Wo,"],["לִי","wo is me,"],["אֵם","the mother of"],["הָאָדָם","men;"],["כּוֹאֶבֶת","am pained,"],["אָנִי","I"],["יְגֵעָה","am weary,"],["אָנִי","I"],["מִפְּנֵי","because of"],["רִשְׁעַת","the wickedness of"],["בָּנָי","my children."],["מָתַי","When"],["אָנוּחַ","shall I rest,"],["וְאֶטָּהֵר","and be cleansed"],["מִן־הַטֻּמְאָה","from the filthiness"],["הַיּוֹצֵאת","which is gone forth"],["מִמֶּנִּי","out of me?"],["מָתַי","When"],["יְקַדְּשֵׁנִי","will sanctify me"],["בּוֹרְאִי","my Creator,"],["לְמַעַן","that"],["אָנוּחַ","I may rest,"],["וְצֶדֶק","and righteousness"],["יִשְׁכֹּן","may abide"],["עַל־פָּנַי","upon my face"],["לָעֵת","for a season?"],["׃",""]
  ]},
  { num: "מט", words: [
    ["וַיִּשְׁמַע","And heard"],["חֲנוֹךְ","Enoch"],["אֶת־הָאָרֶץ","the earth"],["מִתְאַנַּחַת","mourn,"],["וַיֵּבְךְּ","and he wept,"],["וַיִּצְעַק","and cried"],["אֶל־יְהוָה","unto the Lord,"],["לֵאמֹר","saying:"],["אֲדֹנָי","O Lord,"],["הֲלֹא","wilt thou not"],["תְרַחֵם","have compassion"],["עַל־הָאָרֶץ","upon the earth?"],["הֲלֹא","Wilt thou not"],["תְבָרֵךְ","bless"],["בְּנֵי","the children of"],["נֹחַ","Noah?"],["׃",""]
  ]},
  { num: "נ", words: [
    ["וַיֹּסֶף","And continued"],["חֲנוֹךְ","Enoch"],["לִצְעֹק","to cry"],["אֶל־יְהוָה","unto the Lord,"],["לֵאמֹר","saying:"],["מְבַקֵּשׁ","I ask"],["אֲנִי","I"],["מִמְּךָ","of thee,"],["אֲדֹנָי","O Lord,"],["בְּשֵׁם","in the name of"],["יְחִידְךָ","thine Only Begotten,"],["יֵשׁוּעַ","even Jesus"],["הַמָּשִׁיחַ","Christ,"],["רַחֵם","that thou wilt have mercy"],["עַל־נֹחַ","upon Noah"],["וְעַל־זַרְעוֹ","and his seed,"],["לְמַעַן","that"],["לֹא","not"],["תְכֻסֶּה","may be covered"],["הָאָרֶץ","the earth"],["עוֹד","again"],["בַּמַּבּוּל","by a flood."],["׃",""]
  ]},
  { num: "נא", words: [
    ["וְלֹא","And not"],["יָכֹל","could"],["יְהוָה","the Lord"],["לְמָנֵעַ","refuse;"],["וַיִּכְרֹת","and he cut"],["בְּרִית","a covenant"],["עִם־חֲנוֹךְ","with Enoch,"],["וַיִּשָּׁבַע","and sware"],["לוֹ","unto him"],["בִּשְׁבוּעָה","with an oath,"],["לַעֲצֹר","that he would stay"],["מַבּוּל","the floods;"],["וְכִי","that"],["יִקְרָא","he would call"],["אֶל־בְּנֵי","upon the children of"],["נֹחַ","Noah;"],["׃",""]
  ]},
  { num: "נב", words: [
    ["וַיִּשְׁלַח","And he sent forth"],["גְּזֵרָה","a decree,"],["אֲשֶׁר","which"],["לֹא","not"],["תָשׁוּב","shall return,"],["כִּי","that"],["שְׁאֵרִית","a remnant of"],["מִזַּרְעוֹ","his seed"],["תִּמָּצֵא","should be found"],["תָמִיד","always"],["בְּכׇל־הַגּוֹיִם","among all nations,"],["בְּעוֹד","while"],["הָאָרֶץ","the earth"],["עֹמֶדֶת","should stand;"],["׃",""]
  ]},
  { num: "נג", words: [
    ["וַיֹּאמֶר","And said"],["יְהוָה","the Lord:"],["בָּרוּךְ","Blessed is he"],["אֲשֶׁר","whose"],["מִזַּרְעוֹ","seed"],["יָבֹא","shall come"],["הַמָּשִׁיחַ","Messias;"],["כִּי","for"],["אֲנִי","I am"],["הַמָּשִׁיחַ","Messiah,"],["מֶלֶךְ","the King of"],["צִיּוֹן","Zion,"],["צוּר","the Rock of"],["הַשָּׁמַיִם","Heaven,"],["הָרָחָב","which is broad"],["כָּעוֹלָם","as eternity;"],["כׇּל־הַבָּא","whoso cometh"],["בַשַּׁעַר","in at the gate"],["וְעֹלֶה","and climbeth up"],["בִי","by me,"],["לֹא","not"],["יִפֹּל","shall fall"],["לְעוֹלָם","ever."],["לָכֵן","Wherefore,"],["בְּרוּכִים","blessed"],["אֲשֶׁר","are they of whom"],["דִּבַּרְתִּי","I have spoken"],["עֲלֵיהֶם","concerning them,"],["כִּי","for"],["יֵצְאוּ","they shall come forth"],["בְּשִׁירַת","with songs of"],["שִׂמְחַת","joy"],["עַד","everlasting."],["׃",""]
  ]},
  { num: "נד", words: [
    ["וַיִּצְעַק","And cried"],["חֲנוֹךְ","Enoch"],["אֶל־יְהוָה","unto the Lord,"],["לֵאמֹר","saying:"],["כְּבֹא","When shall come"],["בֶן־הָאָדָם","the Son of Man"],["בַּבָּשָׂר","in the flesh,"],["הֲתָנוּחַ","shall rest"],["הָאָרֶץ","the earth?"],["אֲבַקֶּשְׁךָ","I pray thee,"],["הַרְאֵנִי","show me"],["דְּבָרִים","things"],["אֵלֶּה","these."],["׃",""]
  ]},
  { num: "נה", words: [
    ["וַיֹּאמֶר","And said"],["יְהוָה","the Lord"],["אֶל־חֲנוֹךְ","unto Enoch:"],["הַבֵּט","Look."],["וַיַּבֵּט","And he looked,"],["וַיַּרְא","and beheld"],["בֶּן־הָאָדָם","the Son of Man"],["נִשָּׂא","lifted up"],["עַל־הַצְּלָב","on the cross,"],["כְּדֶרֶךְ","after the manner of"],["בְּנֵי","the sons of"],["אָדָם","men."],["׃",""]
  ]},
  { num: "נו", words: [
    ["וַיִּשְׁמַע","And he heard"],["קוֹל","a voice"],["גָּדוֹל","loud;"],["וַיִּכָּסוּ","and were covered"],["הַשָּׁמַיִם","the heavens"],["וַיִּתְאַבְּלוּ","and mourned"],["כׇּל־מַעֲשֵׂי","all the creations of"],["אֱלֹהִים","God;"],["וַתֵּאָנַח","and groaned"],["הָאָרֶץ","the earth;"],["וַיִּבָּקְעוּ","and were rent"],["הַסְּלָעִים","the rocks;"],["וְהַקְּדוֹשִׁים","and the saints"],["קָמוּ","arose,"],["וְנֶעֶטְרוּ","and were crowned"],["לִימִין","at the right hand of"],["בֶּן־הָאָדָם","the Son of Man,"],["עַטְרוֹת","with crowns of"],["כָּבוֹד","glory;"],["׃",""]
  ]},
  { num: "נז", words: [
    ["וְרַבּוֹת","And as many of"],["מִן־הָרוּחוֹת","the spirits"],["בַּכֶּלֶא","as were in prison"],["יָצְאוּ","came forth,"],["וַיַּעַמְדוּ","and stood"],["לִימִין","on the right hand of"],["אֱלֹהִים","God;"],["וְהַשְּׁאָר","and the remainder"],["נִשְׁמְרוּ","were reserved"],["בְכַבְלֵי","in chains of"],["חֹשֶׁךְ","darkness"],["עַד־מִשְׁפַּט","until the judgment of"],["הַיּוֹם","the day"],["הַגָּדוֹל","great."],["׃",""]
  ]},
  { num: "נח", words: [
    ["וַיֹּסֶף","And continued"],["חֲנוֹךְ","Enoch"],["לִבְכּוֹת","to weep,"],["וַיִּצְעַק","and cried"],["אֶל־יְהוָה","unto the Lord,"],["לֵאמֹר","saying:"],["מָתַי","When"],["תָּנוּחַ","shall rest"],["הָאָרֶץ","the earth?"],["׃",""]
  ]},
  { num: "נט", words: [
    ["וַיַּרְא","And beheld"],["חֲנוֹךְ","Enoch"],["בֶּן־הָאָדָם","the Son of Man"],["עֹלֶה","ascend up"],["אֶל־הָאָב","unto the Father;"],["וַיִּקְרָא","and he called"],["אֶל־יְהוָה","unto the Lord,"],["לֵאמֹר","saying:"],["הֲלֹא","Wilt thou not"],["תָשׁוּב","come"],["עוֹד","again"],["אֶל־הָאָרֶץ","upon the earth?"],["יַעַן","Forasmuch as"],["אַתָּה","thou art"],["אֱלֹהִים","God,"],["וַאֲנִי","and I"],["יוֹדֵעַ","know thee,"],["וְאַתָּה","and thou hast"],["נִשְׁבַּעְתָּ","sworn"],["לִי","unto me,"],["וְצִוִּיתָנִי","and commanded me"],["לִשְׁאֹל","that I should ask"],["בְּשֵׁם","in the name of"],["יְחִידְךָ","thine Only Begotten;"],["עָשִׂיתָנִי","thou hast made me,"],["וְנָתַתָּ","and given"],["לִי","unto me"],["זְכוּת","a right"],["לְכִסְאֲךָ","to thy throne,"],["לֹא","not"],["מֵעַצְמִי","of myself,"],["כִּי","but"],["אִם־בְּחַסְדֶּךָ","through thine own grace;"],["לָכֵן","wherefore,"],["אֲבַקֶּשְׁךָ","I ask thee"],["הֲתָשׁוּב","if thou wilt not come"],["עוֹד","again"],["אֶל־הָאָרֶץ","on the earth."],["׃",""]
  ]},
  { num: "ס", words: [
    ["וַיֹּאמֶר","And said"],["יְהוָה","the Lord"],["אֶל־חֲנוֹךְ","unto Enoch:"],["חַי־אָנִי","As I live,"],["כֵּן","even so"],["אָבֹא","will I come"],["בְּאַחֲרִית","in the last"],["הַיָּמִים","days,"],["בִּימֵי","in the days of"],["רֶשַׁע","wickedness"],["וְנָקָם","and vengeance,"],["לְמַלֵּא","to fulfill"],["שְׁבוּעָה","the oath"],["אֲשֶׁר","which"],["נִשְׁבַּעְתִּי","I have made"],["לְךָ","unto thee"],["עַל־בְּנֵי","concerning the children of"],["נֹחַ","Noah;"],["׃",""]
  ]},
  { num: "סא", words: [
    ["וְיָבֹא","And shall come"],["הַיּוֹם","the day"],["אֲשֶׁר","when"],["תָּנוּחַ","shall rest"],["הָאָרֶץ","the earth,"],["אַךְ","but"],["לִפְנֵי","before"],["הַיּוֹם","the day"],["הַהוּא","that,"],["יֶחְשְׁכוּ","shall be darkened"],["הַשָּׁמַיִם","the heavens,"],["וּמָסָךְ","and a veil of"],["חֹשֶׁךְ","darkness"],["יְכַסֶּה","shall cover"],["אֶת־הָאָרֶץ","the earth;"],["וְיִרְעֲשׁוּ","and shall tremble"],["הַשָּׁמַיִם","the heavens"],["וְגַם","and also"],["הָאָרֶץ","the earth;"],["וְצָרוֹת","and tribulations"],["גְּדוֹלוֹת","great"],["יִהְיוּ","shall be"],["בִּבְנֵי","among the children of"],["הָאָדָם","men,"],["אַךְ","but"],["אֶשְׁמֹר","I will preserve"],["עַמִּי","my people."],["׃",""]
  ]},
  { num: "סב", words: [
    ["וּצְדָקָה","And righteousness"],["אוֹרִיד","will I send down"],["מִן־הַשָּׁמַיִם","out of heaven;"],["וֶאֱמֶת","and truth"],["אוֹצִיא","will I send forth"],["מִן־הָאָרֶץ","out of the earth,"],["לְהָעִיד","to bear testimony of"],["עַל־יְחִידִי","mine Only Begotten;"],["תְּחִיָּתוֹ","his resurrection"],["מִן־הַמֵּתִים","from the dead;"],["וְגַם","yea, and also"],["תְּחִיַּת","the resurrection of"],["כׇּל־הָאָדָם","all men;"],["וּצְדָקָה","and righteousness"],["וֶאֱמֶת","and truth"],["אָגֹרֵם","will I cause"],["לִשְׁטֹף","to sweep"],["הָאָרֶץ","the earth"],["כַּמַּבּוּל","as with a flood,"],["לְאַסֵּף","to gather out"],["בְּחִירַי","mine elect"],["מֵאַרְבַּע","from the four"],["כַּנְפוֹת","quarters of"],["הָאָרֶץ","the earth,"],["אֶל־מָקוֹם","unto a place"],["אֲשֶׁר","which"],["אָכִין","I shall prepare,"],["עִיר","a City of"],["קֹדֶשׁ","Holiness,"],["לְמַעַן","that"],["עַמִּי","my people"],["יַחְגְּרוּ","may gird up"],["מׇתְנֵיהֶם","their loins,"],["וְיִצְפּוּ","and be looking forth"],["לְעֵת","for the time of"],["בֹּאִי","my coming;"],["כִּי","for"],["שָׁם","there"],["יִהְיֶה","shall be"],["מִשְׁכָּנִי","my tabernacle,"],["וְיִקָּרֵא","and it shall be called"],["צִיּוֹן","Zion,"],["יְרוּשָׁלַיִם","a Jerusalem"],["חֲדָשָׁה","New."],["׃",""]
  ]},
  { num: "סג", words: [
    ["וַיֹּאמֶר","And said"],["יְהוָה","the Lord"],["אֶל־חֲנוֹךְ","unto Enoch:"],["אָז","Then"],["תִּפְגְּשׁוּ","shall meet"],["אַתָּה","thou"],["וְכׇל־עִירְךָ","and all thy city"],["אוֹתָם","them"],["שָׁם","there,"],["וּנְקַבְּלֵם","and we will receive them"],["אֶל־חֵיקֵנוּ","into our bosom,"],["וְיִרְאוּ","and they shall see"],["אֹתָנוּ","us;"],["וְנִפֹּל","and we will fall"],["עַל־צַוָּארֵיהֶם","upon their necks,"],["וְיִפְּלוּ","and they shall fall"],["עַל־צַוָּארֵינוּ","upon our necks,"],["וְנִשַּׁק","and we will kiss"],["אִישׁ","each"],["אָחִיו","other;"],["׃",""]
  ]},
  { num: "סד", words: [
    ["וְשָׁם","And there"],["יִהְיֶה","shall be"],["מִשְׁכָּנִי","mine abode,"],["וְהוּא","and it shall be"],["צִיּוֹן","Zion,"],["הַיּוֹצֵאת","which shall come forth"],["מִכׇּל־מַעֲשַׂי","out of all the creations"],["וּלְאֶלֶף","which I have made; and for the space of a thousand"],["שָׁנִים","years"],["תָּנוּחַ","shall rest"],["הָאָרֶץ","the earth."],["׃",""]
  ]},
  { num: "סה", words: [
    ["וַיַּרְא","And saw"],["חֲנוֹךְ","Enoch"],["יוֹם","the day of"],["בּוֹא","the coming of"],["בֶן־הָאָדָם","the Son of Man,"],["בְּאַחֲרִית","in the last"],["הַיָּמִים","days,"],["לָשֶׁבֶת","to dwell"],["עַל־הָאָרֶץ","on the earth"],["בְּצֶדֶק","in righteousness"],["לְאֶלֶף","for the space of a thousand"],["שָׁנִים","years;"],["׃",""]
  ]},
  { num: "סו", words: [
    ["אַךְ","But"],["לִפְנֵי","before"],["הַיּוֹם","day"],["הַהוּא","that"],["רָאָה","he saw"],["צָרוֹת","afflictions"],["גְּדוֹלוֹת","great"],["בָּרְשָׁעִים","among the wicked;"],["וְרָאָה","and he saw"],["גַם","also"],["הַיָּם","the sea,"],["נִגְזָר","that it was troubled,"],["וְלֵב","and the heart of"],["אֲנָשִׁים","men"],["נוֹפְלִים","failing them,"],["מִפַּחַד","with fear"],["וְצוֹפִים","and looking forth"],["בְּיִרְאָה","in dread"],["לְמִשְׁפְּטֵי","for the judgments of"],["אֵל","God"],["שַׁדַּי","the Almighty"],["הַבָּאִים","which should come"],["עַל־הָרְשָׁעִים","upon the wicked."],["׃",""]
  ]},
  { num: "סז", words: [
    ["וַיַּרְא","And showed"],["יְהוָה","the Lord unto"],["חֲנוֹךְ","Enoch"],["כׇּל־הַדְּבָרִים","all things,"],["עַד־קֵץ","even unto the end of"],["הָעוֹלָם","the world;"],["וַיַּרְא","and he saw"],["יוֹם","the day of"],["הַצַּדִּיקִים","the righteous,"],["גְּאֻלָּתָם","the hour of their redemption,"],["וַיְקַבֵּל","and received"],["מְלֹא","a fulness of"],["שִׂמְחָה","joy;"],["׃",""]
  ]},
  { num: "סח", words: [
    ["וְכׇל־יְמֵי","And all the days of"],["צִיּוֹן","Zion,"],["בִּימֵי","in the days of"],["חֲנוֹךְ","Enoch,"],["שְׁלֹשׁ","were three"],["מֵאוֹת","hundred"],["וְשִׁשִּׁים","and sixty"],["וְחָמֵשׁ","and five"],["שָׁנִים","years."],["׃",""]
  ]},
  { num: "סט", words: [
    ["וְחֲנוֹךְ","And Enoch"],["וְכׇל־עַמּוֹ","and all his people"],["הִתְהַלְּכוּ","walked"],["עִם־אֱלֹהִים","with God,"],["וְהוּא","and he"],["שָׁכַן","dwelt"],["בְּתוֹכָם","in the midst of Zion;"],["וַיְהִי","and it came to pass"],["צִיּוֹן","that Zion"],["אֵינֶנָּה","was not,"],["כִּי","for"],["לָקַח","took"],["אֹתָהּ","her"],["אֱלֹהִים","God"],["אֶל־חֵיקוֹ","up into his own bosom;"],["וּמֵאָז","and from thence"],["יָצָא","went forth"],["הַדָּבָר","the saying,"],["צִיּוֹן","Zion"],["נָסָה","is fled."],["׃",""]
  ]}
];
renderVerseSet(ms_ch7Verses, 'ms-ch7-verses');
var ms_ch8Verses = [
  { num: "א", words: [
    ["וַיִּהְיוּ","And were"],["כׇּל־יְמֵי","all the days of"],["חֲנוֹךְ","Enoch"],["אַרְבַּע","four"],["מֵאוֹת","hundred"],["וּשְׁלֹשִׁים","and thirty"],["שָׁנָה","years."],["׃",""]
  ]},
  { num: "ב", words: [
    ["וַיְהִי","And it came to pass that"],["וּמְתוּשֶׁלַח","Methuselah,"],["בֶּן־חֲנוֹךְ","the son of Enoch,"],["לֹא","not"],["נִלְקַח","was taken,"],["לְמַעַן","that"],["יִמָּלְאוּ","might be fulfilled"],["בְּרִיתוֹת","the covenants of"],["יְהוָה","the Lord,"],["אֲשֶׁר","which"],["כָּרַת","he made"],["עִם־חֲנוֹךְ","unto Enoch;"],["כִּי","for"],["בֶאֱמֶת","truly"],["כָּרַת","he cut"],["בְּרִית","a covenant"],["עִם־חֲנוֹךְ","with Enoch"],["כִּי","that"],["נֹחַ","Noah"],["יִהְיֶה","should be"],["מִפְּרִי","of the fruit of"],["חֲלָצָיו","his loins."],["׃",""]
  ]},
  { num: "ג", words: [
    ["וַיְהִי","And it came to pass"],["וַיִּתְנַבֵּא","that prophesied"],["מְתוּשֶׁלַח","Methuselah"],["כִּי","that"],["מֵחֲלָצָיו","from his loins"],["יֵצְאוּ","should spring"],["כׇּל־מַמְלְכוֹת","all the kingdoms of"],["הָאָרֶץ","the earth"],["בְּיַד","through"],["נֹחַ","Noah,"],["וַיִּקַּח","and he took"],["כָּבוֹד","glory"],["לְעַצְמוֹ","unto himself."],["׃",""]
  ]},
  { num: "ד", words: [
    ["וַיָּבֹא","And there came"],["רָעָב","a famine"],["גָּדוֹל","great"],["בָּאָרֶץ","in the land,"],["וַיְקַלֵּל","and cursed"],["יְהוָה","the Lord"],["אֶת־הָאָרֶץ","the earth"],["קְלָלָה","with curse"],["קָשָׁה","a sore,"],["וַיָּמוּתוּ","and died"],["רַבִּים","many"],["מִיּוֹשְׁבֶיהָ","of the inhabitants thereof."],["׃",""]
  ]},
  { num: "ה", words: [
    ["וַיְחִי","And lived"],["מְתוּשֶׁלַח","Methuselah"],["מֵאָה","an hundred"],["וּשְׁמֹנִים","and eighty"],["וְשֶׁבַע","and seven"],["שָׁנִים","years,"],["וַיּוֹלֶד","and begat"],["אֶת־לָמֶךְ","Lamech;"],["׃",""]
  ]},
  { num: "ו", words: [
    ["וַיְחִי","And lived"],["מְתוּשֶׁלַח","Methuselah"],["אַחֲרֵי","after"],["הוֹלִידוֹ","he begat"],["אֶת־לָמֶךְ","Lamech"],["שְׁבַע","seven"],["מֵאוֹת","hundred"],["וּשְׁמֹנִים","and eighty"],["וּשְׁתַּיִם","and two"],["שָׁנָה","years,"],["וַיּוֹלֶד","and begat"],["בָּנִים","sons"],["וּבָנוֹת","and daughters;"],["׃",""]
  ]},
  { num: "ז", words: [
    ["וַיִּהְיוּ","And were"],["כׇּל־יְמֵי","all the days of"],["מְתוּשֶׁלַח","Methuselah"],["תְּשַׁע","nine"],["מֵאוֹת","hundred"],["וְשִׁשִּׁים","and sixty"],["וָתֵשַׁע","and nine"],["שָׁנִים","years,"],["וַיָּמֹת","and he died."],["׃",""]
  ]},
  { num: "ח", words: [
    ["וַיְחִי","And lived"],["לֶמֶךְ","Lamech"],["מֵאָה","an hundred"],["וּשְׁמֹנִים","and eighty"],["וּשְׁתַּיִם","and two"],["שָׁנָה","years,"],["וַיּוֹלֶד","and begat"],["בֵּן","a son,"],["׃",""]
  ]},
  { num: "ט", words: [
    ["וַיִּקְרָא","And he called"],["אֶת־שְׁמוֹ","his name"],["נֹחַ","Noah,"],["לֵאמֹר","saying:"],["זֶה","This"],["יְנַחֲמֵנוּ","same shall comfort us"],["מִמַּעֲשֵׂנוּ","concerning our work"],["וּמֵעִצְּבוֹן","and toil of"],["יָדֵינוּ","our hands,"],["מִן־הָאֲדָמָה","because of the ground"],["אֲשֶׁר","which"],["אֵרְרָהּ","hath cursed"],["יְהוָה","the Lord."],["׃",""]
  ]},
  { num: "י", words: [
    ["וַיְחִי","And lived"],["לֶמֶךְ","Lamech"],["אַחֲרֵי","after"],["הוֹלִידוֹ","he begat"],["אֶת־נֹחַ","Noah,"],["חֲמֵשׁ","five"],["מֵאוֹת","hundred"],["וְתִשְׁעִים","and ninety"],["וְחָמֵשׁ","and five"],["שָׁנָה","years,"],["וַיּוֹלֶד","and begat"],["בָּנִים","sons"],["וּבָנוֹת","and daughters;"],["׃",""]
  ]},
  { num: "יא", words: [
    ["וַיִּהְיוּ","And were"],["כׇּל־יְמֵי","all the days of"],["לֶמֶךְ","Lamech"],["שְׁבַע","seven"],["מֵאוֹת","hundred"],["וְשִׁבְעִים","and seventy"],["וָשֶׁבַע","and seven"],["שָׁנִים","years,"],["וַיָּמֹת","and he died."],["׃",""]
  ]},
  { num: "יב", words: [
    ["וַיְהִי","And was"],["נֹחַ","Noah"],["בֶּן־אַרְבַּע","four"],["מֵאוֹת","hundred"],["וַחֲמִשִּׁים","and fifty"],["שָׁנָה","years old,"],["וַיּוֹלֶד","and begat"],["אֶת־יֶפֶת","Japheth;"],["וְאַחֲרֵי","and afterward"],["אַרְבָּעִים","forty"],["וּשְׁתַּיִם","and two"],["שָׁנָה","years"],["הוֹלִיד","he begat"],["אֶת־שֵׁם","Shem"],["מֵאֵשֶׁת","of her who was the mother of"],["יֶפֶת","Japheth,"],["וּבִהְיוֹתוֹ","and when he was"],["בֶּן־חֲמֵשׁ","of five"],["מֵאוֹת","hundred"],["שָׁנָה","years old"],["הוֹלִיד","he begat"],["אֶת־חָם","Ham."],["׃",""]
  ]},
  { num: "יג", words: [
    ["וַיִּשְׁמַע","And hearkened"],["נֹחַ","Noah,"],["וּבָנָיו","and his sons,"],["בְּקוֹל","unto the voice of"],["יְהוָה","the Lord,"],["וַיַּקְשִׁיבוּ","and gave heed,"],["וַיִּקָּרְאוּ","and they were called"],["בְנֵי","the sons of"],["הָאֱלֹהִים","God."],["׃",""]
  ]},
  { num: "יד", words: [
    ["וַיְהִי","And it came to pass"],["כַּאֲשֶׁר","when"],["הֵחֵלּוּ","began"],["הָאֲנָשִׁים","the men"],["הָאֵלֶּה","these"],["לִרְבּוֹת","to multiply"],["עַל־פְּנֵי","on the face of"],["הָאָרֶץ","the land,"],["וּבָנוֹת","that daughters"],["יֻלְּדוּ","were born"],["לָהֶם","unto them,"],["וַיִּרְאוּ","and saw"],["בְנֵי","the sons of"],["הָאָדָם","men"],["אֶת־הַבָּנוֹת","that the daughters"],["כִּי","that"],["טֹבֹת","fair"],["הֵנָּה","they were,"],["וַיִּקְחוּ","and they took"],["לָהֶם","themselves"],["נָשִׁים","wives,"],["מִכֹּל","even as"],["אֲשֶׁר","whomsoever"],["בָּחָרוּ","they chose."],["׃",""]
  ]},
  { num: "טו", words: [
    ["וַיֹּאמֶר","And said"],["יְהוָה","the Lord"],["אֶל־נֹחַ","unto Noah:"],["בְּנוֹת","The daughters of"],["בָּנֶיךָ","thy sons"],["מָכְרוּ","have sold"],["אֶת־עַצְמָן","themselves;"],["כִּי","for"],["הִנֵּה","behold"],["חָרָה","is kindled"],["אַפִּי","mine anger"],["בִּבְנֵי","against the sons of"],["הָאָדָם","men,"],["כִּי","for"],["לֹא","not"],["יִשְׁמְעוּ","they will hearken"],["בְקוֹלִי","to my voice."],["׃",""]
  ]},
  { num: "טז", words: [
    ["וַיְהִי","And it came to pass"],["וַיִּתְנַבֵּא","that prophesied"],["נֹחַ","Noah,"],["וַיְלַמֵּד","and taught"],["אֶת־דִּבְרֵי","the things of"],["אֱלֹהִים","God,"],["כַּאֲשֶׁר","even as"],["הָיָה","it was"],["בָּרֵאשִׁית","in the beginning."],["׃",""]
  ]},
  { num: "יז", words: [
    ["וַיֹּאמֶר","And said"],["יְהוָה","the Lord"],["אֶל־נֹחַ","unto Noah:"],["לֹא־יָדוֹן","Not shall strive"],["רוּחִי","My Spirit"],["בָאָדָם","with man"],["לְעֹלָם","for ever,"],["כִּי","for"],["יֵדַע","he shall know"],["כִּי","that"],["כׇל־בָּשָׂר","all flesh"],["יָמוּת","shall die;"],["אַךְ","yet"],["יָמָיו","his days"],["יִהְיוּ","shall be"],["מֵאָה","an hundred"],["וְעֶשְׂרִים","and twenty"],["שָׁנָה","years;"],["וְאִם־לֹא","and if not"],["יָשׁוּבוּ","shall repent"],["אֲנָשִׁים","men,"],["אֲשַׁלַּח","I will send"],["אֶת־הַמַּבּוּל","the floods"],["עֲלֵיהֶם","upon them."],["׃",""]
  ]},
  { num: "יח", words: [
    ["וּבַיָּמִים","And in days"],["הָהֵם","those"],["הָיוּ","there were"],["נְפִילִים","giants"],["בָּאָרֶץ","on the earth,"],["וַיְבַקְּשׁוּ","and they sought"],["אֶת־נֶפֶשׁ","the life of"],["נֹחַ","Noah;"],["אַךְ","but"],["יְהוָה","the Lord"],["הָיָה","was"],["עִם־נֹחַ","with Noah,"],["וּגְבוּרַת","and the power of"],["יְהוָה","the Lord"],["הָיְתָה","was"],["עָלָיו","upon him."],["׃",""]
  ]},
  { num: "יט", words: [
    ["וַיִּסְמֹךְ","And ordained"],["יְהוָה","the Lord"],["אֶת־נֹחַ","Noah"],["עַל־פִּי","after"],["סִדְרוֹ","his own order,"],["וַיְצַו","and commanded"],["אֹתוֹ","him"],["לָצֵאת","that he should go forth"],["וְלִקְרֹא","and declare"],["אֶת־בְּשׂוֹרָתוֹ","his Gospel"],["לִבְנֵי","unto the children of"],["הָאָדָם","men,"],["כַּאֲשֶׁר","even as"],["נִתְּנָה","it was given"],["לַחֲנוֹךְ","unto Enoch."],["׃",""]
  ]},
  { num: "כ", words: [
    ["וַיְהִי","And it came to pass"],["וַיִּקְרָא","that called"],["נֹחַ","Noah"],["אֶל־בְּנֵי","upon the children of"],["הָאָדָם","men,"],["לָשׁוּב","that they should repent;"],["וְלֹא","but not"],["שָׁמְעוּ","they hearkened"],["לִדְבָרָיו","unto his words;"],["׃",""]
  ]},
  { num: "כא", words: [
    ["וְגַם","And also,"],["אַחֲרֵי","after that"],["שָׁמְעָם","they had heard"],["אֹתוֹ","him,"],["בָּאוּ","they came up"],["לְפָנָיו","before him,"],["לֵאמֹר","saying:"],["הִנֵּה","Behold,"],["אֲנַחְנוּ","we are"],["בְנֵי","the sons of"],["הָאֱלֹהִים","God;"],["הֲלֹא","have we not"],["לָקַחְנוּ","taken"],["לָנוּ","unto ourselves"],["אֶת־בְּנוֹת","the daughters of"],["הָאָדָם","men?"],["וַהֲלֹא","And are not"],["אָנוּ","we"],["אֹכְלִים","eating"],["וְשֹׁתִים","and drinking,"],["וּנְשׁוֹתֵינוּ","and our wives"],["יֹלְדוֹת","bear"],["לָנוּ","unto us"],["בָּנִים","children,"],["וְהֵם","and the same are"],["גִּבֹּרִים","mighty men,"],["כְּאַנְשֵׁי","which are like unto men of"],["קֶדֶם","old,"],["אַנְשֵׁי","men of"],["הַשֵּׁם","renown?"],["וְלֹא","And not"],["שָׁמְעוּ","they hearkened"],["לְדִבְרֵי","unto the words of"],["נֹחַ","Noah."],["׃",""]
  ]},
  { num: "כב", words: [
    ["וַיַּרְא","And saw"],["אֱלֹהִים","God"],["כִּי","that"],["רַבָּה","great was"],["רָעַת","the wickedness of"],["הָאָדָם","man"],["בָּאָרֶץ","on the earth;"],["וְכׇל־אִישׁ","and every man"],["נִשָּׂא","was lifted up"],["בְּמַחֲשְׁבֹת","in the imagination of"],["לִבּוֹ","his heart,"],["רַק","being only"],["רַע","evil"],["כׇּל־הַיּוֹם","continually."],["׃",""]
  ]},
  { num: "כג", words: [
    ["וַיְהִי","And it came to pass"],["וַיּוֹסֶף","that called"],["נֹחַ","Noah"],["לְהַטִּיף","upon"],["אֶל־הָעָם","the children of men"],["לֵאמֹר","that they should believe in the Son of God, and that they should repent of their sins."],["שִׁמְעוּ","Hearken,"],["וְהַקְשִׁיבוּ","and give heed"],["לִדְבָרָי","unto my words;"],["׃",""]
  ]},
  { num: "כד", words: [
    ["הַאֲמִינוּ","Believe"],["וְשׁוּבוּ","and repent"],["מֵחַטֹּאתֵיכֶם","of your sins,"],["וְהִטָּבְלוּ","and be baptized"],["בְּשֵׁם","in the name of"],["יֵשׁוּעַ","Jesus"],["הַמָּשִׁיחַ","Christ,"],["בֶּן־אֱלֹהִים","the Son of God,"],["כַּאֲבוֹתֵינוּ","even as our fathers,"],["וּתְקַבְּלוּ","and ye shall receive"],["אֶת־רוּחַ","the Holy Ghost,"],["הַקֹּדֶשׁ",""],["לְמַעַן","that"],["יִגָּלֶה","may be manifest"],["לָכֶם","unto you"],["כֹּל","all things;"],["וְאִם־לֹא","and if not"],["תַעֲשׂוּ","ye do"],["כֵן","this,"],["יָבֹא","shall come"],["הַמַּבּוּל","the floods"],["עֲלֵיכֶם","upon you;"],["וְלֹא","and not"],["שָׁמֵעוּ","they hearkened."],["׃",""]
  ]},
  { num: "כה", words: [
    ["וַיִּנָּחֶם","And it repented"],["נֹחַ","Noah,"],["וַיִּתְעַצֵּב","and was pained"],["לִבּוֹ","his heart,"],["כִּי","that"],["עָשָׂה","had made"],["יְהוָה","the Lord"],["אֶת־הָאָדָם","man"],["בָּאָרֶץ","on the earth,"],["וַיִּתְעַצֵּב","and it grieved him"],["אֶל־לִבּוֹ","at his heart."],["׃",""]
  ]},
  { num: "כו", words: [
    ["וַיֹּאמֶר","And said"],["יְהוָה","the Lord:"],["אֶמְחֶה","I will destroy"],["אֶת־הָאָדָם","man"],["אֲשֶׁר־בָּרָאתִי","whom I have created,"],["מֵעַל","from"],["פְּנֵי","the face of"],["הָאֲדָמָה","the earth;"],["מֵאָדָם","both man,"],["עַד־בְּהֵמָה","and beast,"],["עַד־רֶמֶשׂ","and the creeping things,"],["וְעַד־עוֹף","and the fowls of"],["הַשָּׁמָיִם","the air;"],["כִּי","for"],["נִחַם","it repenteth"],["נֹחַ","Noah,"],["כִּי","that"],["בְרָאתִים","I have created them,"],["וְכִי","and that"],["עֲשִׂיתִים","I have made them;"],["וְהוּא","and he"],["קָרָא","hath called"],["אֵלַי","unto me;"],["כִּי","for"],["בִקְּשׁוּ","they have sought"],["אֶת־נַפְשׁוֹ","his life."],["׃",""]
  ]},
  { num: "כז", words: [
    ["וְנֹחַ","And Noah"],["מָצָא","found"],["חֵן","grace"],["בְּעֵינֵי","in the eyes of"],["יְהוָה","the Lord;"],["כִּי","for"],["נֹחַ","Noah"],["אִישׁ","a man"],["צַדִּיק","just"],["תָּמִים","and perfect"],["הָיָה","was"],["בְּדֹרֹתָיו","in his generation,"],["וְאֶת־הָאֱלֹהִים","and with God"],["הִתְהַלֶּךְ","walked"],["נֹחַ","Noah,"],["וְגַם","as did also"],["שְׁלֹשֶׁת","three of"],["בָּנָיו","his sons,"],["שֵׁם","Shem,"],["חָם","Ham,"],["וָיָפֶת","and Japheth."],["׃",""]
  ]},
  { num: "כח", words: [
    ["וַתִּשָּׁחֵת","And was corrupt"],["הָאָרֶץ","the earth"],["לִפְנֵי","before"],["הָאֱלֹהִים","God,"],["וַתִּמָּלֵא","and was filled"],["הָאָרֶץ","the earth"],["חָמָס","with violence."],["׃",""]
  ]},
  { num: "כט", words: [
    ["וַיַּרְא","And looked"],["אֱלֹהִים","God"],["אֶת־הָאָרֶץ","upon the earth,"],["וְהִנֵּה","and behold,"],["נִשְׁחָתָה","it was corrupt,"],["כִּי־הִשְׁחִית","for had corrupted"],["כׇּל־בָּשָׂר","all flesh"],["אֶת־דַּרְכּוֹ","his way"],["עַל־הָאָרֶץ","upon the earth."],["׃",""]
  ]},
  { num: "ל", words: [
    ["וַיֹּאמֶר","And said"],["אֱלֹהִים","God"],["אֶל־נֹחַ","unto Noah:"],["קֵץ","The end of"],["כׇּל־בָּשָׂר","all flesh"],["בָּא","is come"],["לְפָנַי","before me,"],["כִּי־מָלְאָה","for is filled"],["הָאָרֶץ","the earth"],["חָמָס","with violence,"],["מִפְּנֵיהֶם","through them;"],["וְהִנְנִי","and behold I"],["מַשְׁחִיתָם","will destroy"],["אֶת־כׇּל־בָּשָׂר","all flesh"],["מִן־הָאָרֶץ","from off the earth."],["׃",""]
  ]}
];
renderVerseSet(ms_ch8Verses, 'ms-ch8-verses');
})();
