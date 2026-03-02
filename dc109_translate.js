// dc109_translate.js — Translate D&C 109 into Biblical Hebrew, gloss, and output verse JS
// The Hebrew translation follows the style of the existing D&C Hebrew translation
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════
// Hebrew translation of D&C 109 — Kirtland Temple Dedicatory Prayer
// ═══════════════════════════════════════════════════════════
const dc109Verses = [
  // v1 Thanks be to thy name, O Lord God of Israel, who keepest covenant and showest mercy unto thy servants who walk uprightly before thee, with all their hearts—
  "1 תּוֹדָה לִשְׁמֶךָ יְהוָה אֱלֹהֵי יִשְׂרָאֵל שׁוֹמֵר הַבְּרִית וּמַרְאֶה חֶסֶד לַעֲבָדֶיךָ הַהֹלְכִים לְפָנֶיךָ בְּיֹשֶׁר בְּכָל־לִבָּם׃",
  // v2 Thou who hast commanded thy servants to build a house to thy name in this place [Kirtland].
  "2 אַתָּה אֲשֶׁר צִוִּיתָ אֶת־עֲבָדֶיךָ לִבְנוֹת בַּיִת לִשְׁמֶךָ בַּמָּקוֹם הַזֶּה׃",
  // v3 And now thou beholdest, O Lord, that thy servants have done according to thy commandment.
  "3 וְעַתָּה רוֹאֶה אַתָּה יְהוָה כִּי עָשׂוּ עֲבָדֶיךָ כְּמִצְוָתֶךָ׃",
  // v4 And now we ask thee, Holy Father, in the name of Jesus Christ, the Son of thy bosom, in whose name alone salvation can be administered to the children of men, we ask thee, O Lord, to accept of this house...
  "4 וְעַתָּה מְבַקְּשִׁים אָנוּ מִמְּךָ אָבִינוּ הַקָּדוֹשׁ בְּשֵׁם יֵשׁוּעַ הַמָּשִׁיחַ בֶּן חֵיקֶךָ אֲשֶׁר בִּשְׁמוֹ לְבַדּוֹ תִּנָּתֵן יְשׁוּעָה לִבְנֵי אָדָם מְבַקְּשִׁים אָנוּ מִמְּךָ יְהוָה לְקַבֵּל אֶת־הַבַּיִת הַזֶּה מַעֲשֵׂה יְדֵי עֲבָדֶיךָ אֲנָחְנוּ אֲשֶׁר צִוִּיתָנוּ לִבְנוֹת׃",
  // v5 For thou knowest that we have done this work through great tribulation; and out of our poverty we have given of our substance to build a house to thy name, that the Son of Man might have a place to manifest himself to his people.
  "5 כִּי יָדַעְתָּ כִּי עָשִׂינוּ אֶת־הַמְּלָאכָה הַזֹּאת בְּצָרָה גְדוֹלָה וּמֵעָנְיֵנוּ נָתַנּוּ מֵהוֹנֵנוּ לִבְנוֹת בַּיִת לִשְׁמֶךָ לְמַעַן יִהְיֶה מָקוֹם לְבֶן־הָאָדָם לְהִתְגַּלּוֹת אֶל עַמּוֹ׃",
  // v6 And as thou hast said in a revelation, given to us, calling us thy friends, saying—Call your solemn assembly, as I have commanded you;
  "6 וְכַאֲשֶׁר אָמַרְתָּ בְּהִתְגַּלּוּת שֶׁנִּתְּנָה לָנוּ קוֹרֵא לָנוּ יְדִידֶיךָ לֵאמֹר קִרְאוּ אֶת עֲצַרְתְּכֶם הַקְּדוֹשָׁה כַּאֲשֶׁר צִוִּיתִי אֶתְכֶם׃",
  // v7 And as all have not faith, seek ye diligently and teach one another words of wisdom; yea, seek ye out of the best books words of wisdom, seek learning even by study and also by faith.
  "7 וּבִהְיוֹת שֶׁלֹּא לְכֻלָּם אֱמוּנָה בַּקְּשׁוּ בְּחָרִיצוּת וְלַמְּדוּ אִישׁ אֶת רֵעֵהוּ דִּבְרֵי חָכְמָה אָכֵן בַּקְּשׁוּ מִתּוֹךְ הַסְּפָרִים הַטּוֹבִים בְּיוֹתֵר דִּבְרֵי חָכְמָה בַּקְּשׁוּ דַּעַת אַף בְּלִמּוּד וְגַם בֶּאֱמוּנָה׃",
  // v8 Organize yourselves; prepare every needful thing, and establish a house, even a house of prayer, a house of fasting, a house of faith, a house of learning, a house of glory, a house of order, a house of God;
  "8 הִתְאַרְגְּנוּ הָכִינוּ כָּל־דָּבָר נָחוּץ וְהָקִימוּ בַּיִת אַף בֵּית תְּפִלָּה בֵּית צוֹם בֵּית אֱמוּנָה בֵּית לִמּוּד בֵּית כָּבוֹד בֵּית סֵדֶר בֵּית אֱלֹהִים׃",
  // v9 That your incomings may be in the name of the Lord, that your outgoings may be in the name of the Lord, that all your salutations may be in the name of the Lord, with uplifted hands unto the Most High;
  "9 לְמַעַן יִהְיוּ בֹאֲכֶם בְּשֵׁם יְהוָה וּמוֹצָאֲכֶם בְּשֵׁם יְהוָה וְכָל בִּרְכוֹתֵיכֶם בְּשֵׁם יְהוָה בְּיָדַיִם נְשׂוּאוֹת אֶל הָעֶלְיוֹן׃",
  // v10 And now, Holy Father, we ask thee to assist us, thy people, with thy grace, in calling our solemn assembly, that it may be done to thine honor and to thy divine acceptance;
  "10 וְעַתָּה אָבִינוּ הַקָּדוֹשׁ מְבַקְּשִׁים אָנוּ מִמְּךָ לַעֲזֹר לָנוּ עַמְּךָ בְּחַסְדְּךָ בְּקָרְאֵנוּ אֶת עֲצַרְתֵּנוּ הַקְּדוֹשָׁה לְמַעַן תֵּעָשֶׂה לִכְבוֹדְךָ וְלִרְצוֹנְךָ הָאֱלֹהִי׃",
  // v11 And in a manner that we may be found worthy, in thy sight, to secure a fulfilment of the promises which thou hast made unto us, thy people, in the revelations given unto us;
  "11 וּבְאֹפֶן שֶׁנִּמָּצֵא רְאוּיִם בְּעֵינֶיךָ לְקַיֵּם אֶת הַהַבְטָחוֹת אֲשֶׁר הִבְטַחְתָּ לָנוּ עַמְּךָ בַּהִתְגַּלֻּיּוֹת שֶׁנִּתְּנוּ לָנוּ׃",
  // v12 That thy glory may rest down upon thy people, and upon this thy house, which we now dedicate to thee, that it may be sanctified and consecrated to be holy, and that thy holy presence may be continually in this house;
  "12 לְמַעַן יָנוּחַ כְּבוֹדְךָ עַל עַמְּךָ וְעַל בֵּיתְךָ זֶה אֲשֶׁר אָנוּ מַקְדִּישִׁים לְךָ עַתָּה לְמַעַן יִתְקַדֵּשׁ וְיֻקְדַּשׁ לִהְיוֹת קֹדֶשׁ וְשֶׁתִּהְיֶה נוֹכְחוּתְךָ הַקְּדוֹשָׁה תָמִיד בַּבַּיִת הַזֶּה׃",
  // v13 And that all people who shall enter upon the threshold of the Lord's house may feel thy power, and feel constrained to acknowledge that thou hast sanctified it, and that it is thy house, a place of thy holiness.
  "13 וְשֶׁכָּל אָדָם הַבָּא אֶל מִפְתַּן בֵּית יְהוָה יָחוּשׁ אֶת גְּבוּרָתְךָ וְיוּכְרַח לְהוֹדוֹת כִּי קִדַּשְׁתָּ אוֹתוֹ וְכִי הוּא בֵּיתֶךָ מְקוֹם קָדְשֶׁךָ׃",
  // v14 And do thou grant, Holy Father, that all those who shall worship in this house may be taught words of wisdom out of the best books, and that they may seek learning even by study and also by faith, as thou hast said;
  "14 וְתֵן אָבִינוּ הַקָּדוֹשׁ שֶׁכָּל הָעוֹבְדִים בַּבַּיִת הַזֶּה יִלְמְדוּ דִּבְרֵי חָכְמָה מִתּוֹךְ הַסְּפָרִים הַטּוֹבִים בְּיוֹתֵר וְשֶׁיְּבַקְּשׁוּ דַּעַת אַף בְּלִמּוּד וְגַם בֶּאֱמוּנָה כַּאֲשֶׁר אָמָרְתָּ׃",
  // v15 And that they may grow up in thee, and receive a fulness of the Holy Ghost, and be organized according to thy laws, and be prepared to obtain every needful thing;
  "15 וְשֶׁיִּגְדְּלוּ בְּךָ וִיקַבְּלוּ מְלוֹא רוּחַ הַקֹּדֶשׁ וְיִתְאַרְגְּנוּ כְּחֻקֶּיךָ וְיִהְיוּ מוּכָנִים לְהַשִּׂיג כָּל דָּבָר נָחוּץ׃",
  // v16 And that this house may be a house of prayer, a house of fasting, a house of faith, a house of glory and of God, even thy house;
  "16 וְשֶׁיִּהְיֶה הַבַּיִת הַזֶּה בֵּית תְּפִלָּה בֵּית צוֹם בֵּית אֱמוּנָה בֵּית כָּבוֹד וּבֵית אֱלֹהִים אַף בֵּיתֶךָ׃",
  // v17 That all the incomings of thy people, into this house, may be in the name of the Lord;
  "17 לְמַעַן יִהְיוּ כָּל בֹּאֵי עַמְּךָ אֶל הַבַּיִת הַזֶּה בְּשֵׁם יְהוָה׃",
  // v18 That all their outgoings from this house may be in the name of the Lord;
  "18 וּלְמַעַן יִהְיוּ כָּל מוֹצָאֵיהֶם מִן הַבַּיִת הַזֶּה בְּשֵׁם יְהוָה׃",
  // v19 And that all their salutations may be in the name of the Lord, with holy hands, uplifted to the Most High;
  "19 וּלְמַעַן יִהְיוּ כָּל בִּרְכוֹתֵיהֶם בְּשֵׁם יְהוָה בְּיָדַיִם קְדוֹשׁוֹת נְשׂוּאוֹת אֶל הָעֶלְיוֹן׃",
  // v20 And that no unclean thing shall be permitted to come into thy house to pollute it;
  "20 וְשֶׁלֹּא יֻרְשֶׁה לְשׁוּם דָּבָר טָמֵא לָבוֹא אֶל בֵּיתֶךָ לְחַלְּלוֹ׃",
  // v21 And when thy people transgress, any of them, they may speedily repent and return unto thee, and find favor in thy sight, and be restored to the blessings which thou hast ordained to be poured out upon those who shall reverence thee in thy house.
  "21 וְכַאֲשֶׁר יִפְשְׁעוּ מֵעַמְּךָ אֶחָד מֵהֶם יָשׁוּבוּ בִּמְהֵרָה בִּתְשׁוּבָה אֵלֶיךָ וְיִמְצְאוּ חֵן בְּעֵינֶיךָ וְיוּחֲזְרוּ אֶל הַבְּרָכוֹת אֲשֶׁר הוֹרֵיתָ לְהִשָּׁפֵךְ עַל הַמְכַבְּדִים אוֹתְךָ בְּבֵיתֶךָ׃",
  // v22 And we ask thee, Holy Father, that thy servants may go forth from this house armed with thy power, and that thy name may be upon them, and thy glory be round about them, and thine angels have charge over them;
  "22 וּמְבַקְּשִׁים אָנוּ מִמְּךָ אָבִינוּ הַקָּדוֹשׁ שֶׁעֲבָדֶיךָ יֵצְאוּ מִן הַבַּיִת הַזֶּה מְזֻיָּנִים בִּגְבוּרָתֶךָ וְשֶׁיִּהְיֶה שִׁמְךָ עֲלֵיהֶם וּכְבוֹדְךָ סְבִיבוֹתָם וּמַלְאָכֶיךָ שׁוֹמְרִים עֲלֵיהֶם׃",
  // v23 And from this place they may bear exceedingly great and glorious tidings, in truth, unto the ends of the earth, that they may know that this is thy work, and that thou hast put forth thy hand, to fulfil that which thou hast spoken by the mouths of the prophets, concerning the last days.
  "23 וּמִן הַמָּקוֹם הַזֶּה יִשְׂאוּ בְּשׂוֹרוֹת גְּדוֹלוֹת וְנִכְבָּדוֹת מְאֹד בֶּאֱמֶת עַד קְצוֹת הָאָרֶץ לְמַעַן יֵדְעוּ כִּי זֶה מַעֲשֶׂךָ וְכִי שָׁלַחְתָּ יָדְךָ לְקַיֵּם אֵת אֲשֶׁר דִּבַּרְתָּ בְּפִי הַנְּבִיאִים עַל אַחֲרִית הַיָּמִים׃",
  // v24 We ask thee, Holy Father, to establish the people that shall worship, and honorably hold a name and standing in this thy house, to all generations and for eternity;
  "24 מְבַקְּשִׁים אָנוּ מִמְּךָ אָבִינוּ הַקָּדוֹשׁ לְכוֹנֵן אֶת הָעָם אֲשֶׁר יַעַבְדוּ וְיִנְצְרוּ בְּכָבוֹד שֵׁם וּמַעֲמָד בְּבֵיתְךָ זֶה לְכָל הַדּוֹרוֹת וּלְעוֹלָם׃",
  // v25 That no weapon formed against them shall prosper; that he who diggeth a pit for them shall fall into the same himself;
  "25 שֶׁכָּל־כְּלִי יוּצַר עָלֵיהֶם לֹא יִצְלָח וְהַחוֹפֵר שַׁחַת לָהֶם הוּא יִפֹּל בָּהּ׃",
  // v26 That no combination of wickedness shall have power to rise up and prevail over thy people upon whom thy name shall be put in this house;
  "26 שֶׁשׁוּם קֶשֶׁר רֶשַׁע לֹא יִגְבַּר לָקוּם וְלִנְצֹחַ אֶת עַמְּךָ אֲשֶׁר יִקָּרֵא שִׁמְךָ עָלָיו בַּבַּיִת הַזֶּה׃",
  // v27 And if any people shall rise against this people, that thine anger be kindled against them;
  "27 וְאִם יָקוּם עַם עַל הָעָם הַזֶּה יִחַר אַפְּךָ בָּהֶם׃",
  // v28 And if they shall smite this people thou wilt smite them; thou wilt fight for thy people as thou didst in the day of battle, that they may be delivered from the hands of all their enemies.
  "28 וְאִם יַכּוּ אֶת הָעָם הַזֶּה תַּכֵּם אַתָּה תִּלָּחֵם בְּעַד עַמְּךָ כַּאֲשֶׁר עָשִׂיתָ בְּיוֹם קְרָב לְמַעַן יִנָּצְלוּ מִיַּד כָּל אוֹיְבֵיהֶם׃",
  // v29 We ask thee, Holy Father, to confound, and astonish, and to bring to shame and confusion, all those who have spread lying reports abroad, over the world, against thy servant or servants, if they will not repent, when the everlasting gospel shall be proclaimed in their ears;
  "29 מְבַקְּשִׁים אָנוּ מִמְּךָ אָבִינוּ הַקָּדוֹשׁ לְבַלְבֵּל וּלְהַדְהִים וּלְהָבִיא בֹשֶׁת וּמְבוּכָה עַל כָּל אֲשֶׁר הֵפִיצוּ שְׁמוּעוֹת שֶׁקֶר בָּעוֹלָם עַל עַבְדְּךָ אוֹ עֲבָדֶיךָ אִם לֹא יָשׁוּבוּ בִּתְשׁוּבָה בְּהִשָּׁמַע בְּשׂוֹרַת עוֹלָם בְּאָזְנֵיהֶם׃",
  // v30 And that all their works may be brought to naught, and be swept away by the hail, and by the judgments which thou wilt send upon them in thine anger, that there may be an end to lyings and slanders against thy people.
  "30 וְשֶׁכָּל מַעֲשֵׂיהֶם יוּבְאוּ לְאַיִן וְיִסָּחֲפוּ בַּבָּרָד וּבַמִּשְׁפָּטִים אֲשֶׁר תִּשְׁלַח עֲלֵיהֶם בְּאַפֶּךָ לְמַעַן יִהְיֶה קֵץ לַכְּזָבִים וְלַדִּבּוֹת עַל עַמֶּךָ׃",
  // v31 For thou knowest, O Lord, that thy servants have been innocent before thee in bearing record of thy name, for which they have suffered these things.
  "31 כִּי יָדַעְתָּ יְהוָה כִּי נְקִיִּם הָיוּ עֲבָדֶיךָ לְפָנֶיךָ בְּהֵעִידָם עַל שִׁמְךָ אֲשֶׁר בִּגְלָלוֹ סָבְלוּ אֶת הַדְּבָרִים הָאֵלֶּה׃",
  // v32 Therefore we plead before thee for a full and complete deliverance from under this yoke;
  "32 לָכֵן מִתְחַנְּנִים אָנוּ לְפָנֶיךָ עַל גְּאֻלָּה שְׁלֵמָה וְגַמוּרָה מִתַּחַת הָעֹל הַזֶּה׃",
  // v33 Break it off, O Lord; break it off from the necks of thy servants, by thy power, that we may rise up in the midst of this generation and do thy work.
  "33 שְׁבֹר אוֹתוֹ יְהוָה שְׁבֹר אוֹתוֹ מֵעַל צַוְּארֵי עֲבָדֶיךָ בִּגְבוּרָתֶךָ לְמַעַן נָקוּם בְּתוֹךְ הַדּוֹר הַזֶּה וְנַעֲשֶׂה אֶת מְלַאכְתֶּךָ׃",
  // v34 O Jehovah, have mercy upon this people, and as all men sin, forgive the transgressions of thy people, and let them be blotted out forever.
  "34 יְהוָה רַחֵם עַל הָעָם הַזֶּה וּכְמוֹ שֶׁכָּל אָדָם חוֹטֵא סְלַח לְפִשְׁעֵי עַמֶּךָ וְיִמָּחוּ לָעַד׃",
  // v35 Let the anointing of thy ministers be sealed upon them with power from on high.
  "35 תֵּחָתֵם מִשְׁחַת מְשָׁרְתֶיךָ עֲלֵיהֶם בְּכֹחַ מִמָּרוֹם׃",
  // v36 Let it be fulfilled upon them, as upon those on the day of Pentecost; let the gift of tongues be poured out upon thy people, even cloven tongues as of fire, and the interpretation thereof.
  "36 יִתְקַיֵּם עֲלֵיהֶם כַּאֲשֶׁר הָיָה בְּיוֹם חַג הַשָּׁבוּעוֹת תִּשָּׁפֵךְ מַתַּת הַלְּשׁוֹנוֹת עַל עַמֶּךָ אַף לְשׁוֹנוֹת מְפֻצָּלוֹת כָּאֵשׁ וּפִתְרוֹנָן׃",
  // v37 And let thy house be filled, as with a rushing mighty wind, with thy glory.
  "37 וְיִמָּלֵא בֵיתְךָ כְּרוּחַ סוֹעָה אַדִּירָה בִּכְבוֹדֶךָ׃",
  // v38 Put upon thy servants the testimony of the covenant, that when they go out and proclaim thy word they may seal up the law, and prepare the hearts of thy saints for all those judgments thou art about to send, in thy wrath, upon the inhabitants of the earth...
  "38 שִׂים עַל עֲבָדֶיךָ עֵדוּת הַבְּרִית לְמַעַן בְּצֵאתָם וּבְהַכְרִיזָם אֶת דְּבָרְךָ יַחְתְּמוּ אֶת הַתּוֹרָה וְיָכִינוּ אֶת לִבּוֹת קְדוֹשֶׁיךָ לְכָל הַמִּשְׁפָּטִים אֲשֶׁר אַתָּה עוֹמֵד לִשְׁלֹחַ בַּחֲרוֹנְךָ עַל יוֹשְׁבֵי הָאָרֶץ בִּגְלַל פִּשְׁעֵיהֶם לְמַעַן יִנָּצֵל עַמְּךָ וְלֹא יֹאבַד כָּרֶשַׁע׃",
  // v39 And whatsoever city thy servants shall enter, and the people of that city receive their testimony, let thy peace and thy salvation be upon that city; that they may gather out of that city the righteous...
  "39 וְכָל עִיר אֲשֶׁר יָבֹאוּ עֲבָדֶיךָ וְעַם הָעִיר הַהִיא יְקַבְּלוּ עֵדוּתָם יְהִי שְׁלוֹמְךָ וִישׁוּעָתְךָ עַל הָעִיר הַהִיא לְמַעַן יְאַסְּפוּ מִתּוֹכָהּ אֶת הַצַּדִּיקִים לָבוֹא אֶל צִיּוֹן אוֹ אֶל יְתֵדוֹתֶיהָ בְּשִׁירֵי שִׂמְחַת עוֹלָם׃",
  // v40 And until this be accomplished, let not thy judgments fall upon that city.
  "40 וְעַד שֶׁיֵּעָשֶׂה הַדָּבָר הַזֶּה אַל יִפְּלוּ מִשְׁפָּטֶיךָ עַל הָעִיר הַהִיא׃",
  // v41 And whatsoever city thy servants shall enter, and the people of that city receive not the testimony of thy servants, and thy servants warn them to save themselves from this untoward generation, let it be upon that city according to that which thou hast spoken by the mouths of thy prophets.
  "41 וְכָל עִיר אֲשֶׁר יָבֹאוּ עֲבָדֶיךָ וְעַם הָעִיר הַהִיא לֹא יְקַבְּלוּ עֵדוּת עֲבָדֶיךָ וְעֲבָדֶיךָ יַזְהִירוּם לְהִנָּצֵל מִן הַדּוֹר הָעִקֵּשׁ הַזֶּה יִהְיֶה עַל הָעִיר הַהִיא כַּאֲשֶׁר דִּבַּרְתָּ בְּפִי נְבִיאֶיךָ׃",
  // v42 But deliver thou, O Jehovah, we beseech thee, thy servants from their hands, and cleanse them from their blood.
  "42 אַךְ הַצֵּל יְהוָה מְבַקְּשִׁים אָנוּ מִמְּךָ אֶת עֲבָדֶיךָ מִיָּדָם וְטַהֲרֵם מִדָּמָם׃",
  // v43 O Lord, we delight not in the destruction of our fellow men; their souls are precious before thee;
  "43 יְהוָה לֹא נִשְׂמַח בְּהַשְׁמָדַת בְּנֵי אָדָם חֲבֵרֵינוּ נַפְשׁוֹתָם יְקָרוֹת לְפָנֶיךָ׃",
  // v44 But thy word must be fulfilled. Help thy servants to say, with thy grace assisting them: Thy will be done, O Lord, and not ours.
  "44 אַךְ דְּבָרְךָ צָרִיךְ לְהִתְקַיֵּם עֲזֹר לַעֲבָדֶיךָ לוֹמַר בְּחַסְדְּךָ הָעוֹזֵר לָהֶם יֵעָשֶׂה רְצוֹנְךָ יְהוָה וְלֹא רְצוֹנֵנוּ׃",
  // v45 We know that thou hast spoken by the mouth of thy prophets terrible things concerning the wicked, in the last days—that thou wilt pour out thy judgments, without measure;
  "45 יָדַעְנוּ כִּי דִּבַּרְתָּ בְּפִי נְבִיאֶיךָ דְּבָרִים נוֹרָאִים עַל הָרְשָׁעִים בְּאַחֲרִית הַיָּמִים כִּי תִשְׁפֹּךְ מִשְׁפָּטֶיךָ בְּלִי מִדָּה׃",
  // v46 Therefore, O Lord, deliver thy people from the calamity of the wicked; enable thy servants to seal up the law, and bind up the testimony, that they may be prepared against the day of burning.
  "46 לָכֵן יְהוָה הַצֵּל אֶת עַמְּךָ מֵאֵיד הָרְשָׁעִים הַכְשֵׁר אֶת עֲבָדֶיךָ לַחְתֹּם אֶת הַתּוֹרָה וְלִצְרֹר אֶת הָעֵדוּת לְמַעַן יִהְיוּ מוּכָנִים לְיוֹם הַשְּׂרֵפָה׃",
  // v47 We ask thee, Holy Father, to remember those who have been driven by the inhabitants of Jackson county, Missouri, from the lands of their inheritance, and break off, O Lord, this yoke of affliction that has been put upon them.
  "47 מְבַקְּשִׁים אָנוּ מִמְּךָ אָבִינוּ הַקָּדוֹשׁ לִזְכֹּר אֶת הַמְגֹרָשִׁים בִּידֵי יוֹשְׁבֵי מַחוֹז ג׳ֶקְסוֹן מִיזוּרִי מֵאֶרֶץ נַחֲלָתָם וּשְׁבֹר יְהוָה אֶת עֹל הָעֹנִי הַזֶּה אֲשֶׁר הוּשַׂם עֲלֵיהֶם׃",
  // v48 Thou knowest, O Lord, that they have been greatly oppressed and afflicted by wicked men; and our hearts flow out with sorrow because of their grievous burdens.
  "48 יָדַעְתָּ יְהוָה כִּי עֻנּוּ מְאֹד וְסָבְלוּ מִידֵי אֲנָשִׁים רְשָׁעִים וּלְבָבֵנוּ נִמְלָאִים צַעַר עַל מַשָּׂאָם הַכָּבֵד׃",
  // v49 O Lord, how long wilt thou suffer this people to bear this affliction, and the cries of their innocent ones to ascend up in thine ears, and their blood come up in testimony before thee, and thou not make a display of thy testimony in their behalf?
  "49 יְהוָה עַד מָתַי תַּנִּיחַ לָעָם הַזֶּה לָשֵׂאת אֶת הָעֹנִי הַזֶּה וּצַעֲקַת נְקִיֵּיהֶם לַעֲלוֹת בְּאָזְנֶיךָ וְדָמָם לָבוֹא לְעֵדוּת לְפָנֶיךָ וְאַתָּה לֹא מַרְאֶה עֵדוּתְךָ בַּעֲדָם׃",
  // v50 Have mercy, O Lord, upon the wicked mob, who have driven thy people, that they may cease to spoil, that they may repent of their sins if repentance is to be found;
  "50 רַחֵם יְהוָה עַל הַהָמוֹן הָרָשָׁע אֲשֶׁר גֵּרְשׁוּ אֶת עַמֶּךָ לְמַעַן יֶחְדְּלוּ מִלִּשְׁדֹּד לְמַעַן יָשׁוּבוּ מֵחַטֹּאתֵיהֶם אִם תְּשׁוּבָה נִמְצֵאת׃",
  // v51 But if they will not, make bare thine arm, O Lord, and redeem that which thou didst appoint a Zion unto thy people.
  "51 וְאִם לֹא יֹאבוּ חֲשֹׂף זְרוֹעֲךָ יְהוָה וּגְאַל אֵת אֲשֶׁר מִנִּיתָ לְצִיּוֹן לְעַמֶּךָ׃",
  // v52 And if it cannot be otherwise, that the cause of thy people may not fail before thee may thine anger be kindled, and thine indignation fall upon them...
  "52 וְאִם לֹא יוּכַל אַחֶרֶת לְמַעַן לֹא תִכָּשֵׁל דְּבַר עַמְּךָ לְפָנֶיךָ יִחַר אַפְּךָ וְיִפֹּל זַעְמְךָ עֲלֵיהֶם לְמַעַן יִכָּרְתוּ בֵּין אָדָם לְבֵהֵמָה׃",
  // v53 But inasmuch as they will repent, thou art gracious and merciful, and wilt turn away thy wrath when thou lookest upon the face of thine Anointed.
  "53 אַךְ בְּמִדָּה שֶׁיָּשׁוּבוּ בִּתְשׁוּבָה חַנּוּן וְרַחוּם אַתָּה וְתָשִׁיב חֲרוֹנְךָ בְּהַבִּיטְךָ עַל פְּנֵי מְשִׁיחֶךָ׃",
  // v54 Have mercy, O Lord, upon all the nations of the earth; have mercy upon the rulers of our land; may those principles, which were so honorably and nobly defended, namely, the Constitution of our land, by our fathers, be established forever.
  "54 רַחֵם יְהוָה עַל כָּל גּוֹיֵי הָאָרֶץ רַחֵם עַל מוֹשְׁלֵי אַרְצֵנוּ יִכּוֹנְנוּ לָעַד הָעִקָּרוֹנוֹת אֲשֶׁר הוּגְנוּ בְּכָבוֹד וּבְאֹמֶץ בִּידֵי אֲבוֹתֵינוּ דְּהַיְנוּ חֻקַּת אַרְצֵנוּ׃",
  // v55 Remember the kings, the princes, the nobles, and the great ones of the earth, and all people, and the churches, all the poor, the needy, and afflicted ones of the earth;
  "55 זְכֹר אֶת הַמְּלָכִים אֶת הַשָּׂרִים אֶת הַנְּדִיבִים וְאֶת גְּדוֹלֵי הָאָרֶץ וְאֶת כָּל הָעַמִּים וְאֶת הָעֵדוֹת אֵת כָּל הָעֲנִיִּים הַנֶּאֱדָרִים וְהַנִּדְכָּאִים שֶׁבָּאָרֶץ׃",
  // v56 That their hearts may be softened when thy servants shall go out from thy house, O Jehovah, to bear testimony of thy name; that their prejudices may give way before the truth, and thy people may obtain favor in the sight of all;
  "56 לְמַעַן יֵרַכּוּ לִבּוֹתָם בְּצֵאת עֲבָדֶיךָ מִבֵּיתְךָ יְהוָה לְהָעִיד עַל שִׁמְךָ לְמַעַן תָּסוּרְנָה מִשְׂטְמוֹתֵיהֶם מִפְּנֵי הָאֱמֶת וְעַמְּךָ יִמְצְאוּ חֵן בְּעֵינֵי כֹל׃",
  // v57 That all the ends of the earth may know that we, thy servants, have heard thy voice, and that thou hast sent us;
  "57 לְמַעַן יֵדְעוּ כָּל אַפְסֵי אָרֶץ כִּי אָנוּ עֲבָדֶיךָ שָׁמַעְנוּ קוֹלֶךָ וְכִי אַתָּה שְׁלַחְתָּנוּ׃",
  // v58 That from among all these, thy servants, the sons of Jacob, may gather out the righteous to build a holy city to thy name, as thou hast commanded them.
  "58 לְמַעַן מִתּוֹךְ כָּל אֵלֶּה יְאַסְּפוּ עֲבָדֶיךָ בְּנֵי יַעֲקֹב אֶת הַצַּדִּיקִים לִבְנוֹת עִיר קֹדֶשׁ לִשְׁמֶךָ כַּאֲשֶׁר צִוִּיתָם׃",
  // v59 We ask thee to appoint unto Zion other stakes besides this one which thou hast appointed, that the gathering of thy people may roll on in great power and majesty, that thy work may be cut short in righteousness.
  "59 מְבַקְּשִׁים אָנוּ מִמְּךָ לְמַנּוֹת לְצִיּוֹן יְתֵדוֹת אֲחֵרוֹת מִלְּבַד זוֹ אֲשֶׁר מִנִּיתָ לְמַעַן יִתְגַּלְגֵּל קִבּוּץ עַמְּךָ בְּכֹחַ גָּדוֹל וּבְהוֹד לְמַעַן תְּקַצֵּר מְלַאכְתְּךָ בִּצְדָקָה׃",
  // v60 Now these words, O Lord, we have spoken before thee, concerning the revelations and commandments which thou hast given unto us, who are identified with the Gentiles.
  "60 עַתָּה אֶת הַדְּבָרִים הָאֵלֶּה יְהוָה דִּבַּרְנוּ לְפָנֶיךָ עַל הַהִתְגַּלֻּיּוֹת וְהַמִּצְוֹת אֲשֶׁר נָתַתָּ לָנוּ הַמְזוּהִים עִם הַגּוֹיִם׃",
  // v61 But thou knowest that thou hast a great love for the children of Jacob, who have been scattered upon the mountains for a long time, in a cloudy and dark day.
  "61 אַךְ יָדַעְתָּ כִּי אַהֲבָה גְדוֹלָה לְךָ לִבְנֵי יַעֲקֹב אֲשֶׁר נָפוֹצוּ עַל הֶהָרִים זְמַן רַב בְּיוֹם עָנָן וַעֲרָפֶל׃",
  // v62 We therefore ask thee to have mercy upon the children of Jacob, that Jerusalem, from this hour, may begin to be redeemed;
  "62 לָכֵן מְבַקְּשִׁים אָנוּ מִמְּךָ לְרַחֵם עַל בְּנֵי יַעֲקֹב לְמַעַן תָּחֵל יְרוּשָׁלַיִם מִן הַשָּׁעָה הַזֹּאת לְהִגָּאֵל׃",
  // v63 And the yoke of bondage may begin to be broken off from the house of David;
  "63 וְעֹל הָעַבְדוּת יָחֵל לְהִשָּׁבֵר מֵעַל בֵּית דָּוִד׃",
  // v64 And the children of Judah may begin to return to the lands which thou didst give to Abraham, their father.
  "64 וּבְנֵי יְהוּדָה יָחֵלּוּ לָשׁוּב אֶל הָאֲרָצוֹת אֲשֶׁר נָתַתָּ לְאַבְרָהָם אֲבִיהֶם׃",
  // v65 And cause that the remnants of Jacob, who have been cursed and smitten because of their transgression, be converted from their wild and savage condition to the fulness of the everlasting gospel;
  "65 וְעֲשֵׂה שֶׁשְּׁאֵרִית יַעֲקֹב אֲשֶׁר קֻלְלוּ וְהֻכּוּ בִּגְלַל פִּשְׁעָם יָשׁוּבוּ מִמַּצָּבָם הַפֶּרֶא וְהַפָּרוּעַ אֶל מְלוֹא בְשׂוֹרַת עוֹלָם׃",
  // v66 That they may lay down their weapons of bloodshed, and cease their rebellions.
  "66 לְמַעַן יַנִּיחוּ כְּלֵי שְׁפִיכוּת דָּמִים וְיֶחְדְּלוּ מֵרִיבוֹתֵיהֶם׃",
  // v67 And may all the scattered remnants of Israel, who have been driven to the ends of the earth, come to a knowledge of the truth, believe in the Messiah, and be redeemed from oppression, and rejoice before thee.
  "67 וְיָבֹאוּ כָּל שְׁאֵרִית יִשְׂרָאֵל הַנְּפוּצָה אֲשֶׁר גֹּרְשָׁה אֶל קְצוֹת הָאָרֶץ לְדַעַת הָאֱמֶת וּלְהַאֲמִין בַּמָּשִׁיחַ וְלְהִגָּאֵל מֵעֹשֶׁק וְלִשְׂמֹחַ לְפָנֶיךָ׃",
  // v68 O Lord, remember thy servant, Joseph Smith, Jun., and all his afflictions and persecutions—how he has covenanted with Jehovah, and vowed to thee, O Mighty God of Jacob—and the commandments which thou hast given unto him, and that he hath sincerely striven to do thy will.
  "68 יְהוָה זְכֹר אֶת עַבְדְּךָ יוֹסֵף סְמִית וְאֵת כָּל עֳנְיָיו וּרְדִיפוֹתָיו אֵיךְ כָּרַת בְּרִית עִם יְהוָה וְנָדַר לְךָ אֵל גִּבּוֹר יַעֲקֹב וְאֵת הַמִּצְוֹת אֲשֶׁר נָתַתָּ לוֹ וְכִי הִשְׁתַּדֵּל בַּאֲמִתּוּת לַעֲשׂוֹת רְצוֹנֶךָ׃",
  // v69 Have mercy, O Lord, upon his wife and children, that they may be exalted in thy presence, and preserved by thy fostering hand.
  "69 רַחֵם יְהוָה עַל אִשְׁתּוֹ וְעַל בָּנָיו לְמַעַן יָרוּמוּ בִּנְכָחֶךָ וְיִשָּׁמְרוּ בְּיַד חֶסֶד מְגַדַּלְתֶּךָ׃",
  // v70 Have mercy upon all their immediate connections, that their prejudices may be broken up and swept away as with a flood; that they may be converted and redeemed with Israel, and know that thou art God.
  "70 רַחֵם עַל כָּל קְרוֹבֵיהֶם לְמַעַן תִּשָּׁבַרְנָה מִשְׂטְמוֹתֵיהֶם וְתִסָּחַפְנָה כְּבַמַּבּוּל לְמַעַן יָשׁוּבוּ וְיִגָּאֲלוּ עִם יִשְׂרָאֵל וְיֵדְעוּ כִּי אַתָּה אֱלֹהִים׃",
  // v71 Remember, O Lord, the presidents, even all the presidents of thy church, that thy right hand may exalt them, with all their families, and their immediate connections, that their names may be perpetuated and had in everlasting remembrance from generation to generation.
  "71 זְכֹר יְהוָה אֶת הַנְּשִׂיאִים אֵת כָּל נְשִׂיאֵי עֵדָתֶךָ לְמַעַן תְּרוֹמְמֵם יְמִינְךָ עִם כָּל מִשְׁפְּחוֹתֵיהֶם וּקְרוֹבֵיהֶם לְמַעַן יִנָּצְרוּ שְׁמוֹתֵיהֶם וְיִהְיוּ בְּזִכָּרוֹן עוֹלָם מִדּוֹר לְדוֹר׃",
  // v72 Remember all thy church, O Lord, with all their families, and all their immediate connections, with all their sick and afflicted ones, with all the poor and meek of the earth; that the kingdom, which thou hast set up without hands, may become a great mountain and fill the whole earth;
  "72 זְכֹר אֶת כָּל עֵדָתְךָ יְהוָה עִם כָּל מִשְׁפְּחוֹתֵיהֶם וְכָל קְרוֹבֵיהֶם עִם כָּל חוֹלֵיהֶם וְסוֹבְלֵיהֶם עִם כָּל עֲנִיֵּי הָאָרֶץ וַעֲנָוֶיהָ לְמַעַן הַמַּלְכוּת אֲשֶׁר הֲקִימוֹתָ בְּלֹא יָדַיִם תִּהְיֶה לְהַר גָּדוֹל וּמָלְאָה אֶת כָּל הָאָרֶץ׃",
  // v73 That thy church may come forth out of the wilderness of darkness, and shine forth fair as the moon, clear as the sun, and terrible as an army with banners;
  "73 לְמַעַן תֵּצֵא עֵדָתְךָ מִמִּדְבַּר הַחֹשֶׁךְ וְתָאִיר יָפָה כַלְּבָנָה בָּרָה כַחַמָּה אֲיֻמָּה כַּנִּדְגָּלוֹת׃",
  // v74 And be adorned as a bride for that day when thou shalt unveil the heavens, and cause the mountains to flow down at thy presence, and the valleys to be exalted, the rough places made smooth; that thy glory may fill the earth;
  "74 וְתִתְקַשֵּׁט כְּכַלָּה לַיּוֹם אֲשֶׁר תִּגְלֶה אֶת הַשָּׁמַיִם וְתָמֵס הֶהָרִים מִלְּפָנֶיךָ וְהָעֲמָקִים יִנָּשְׂאוּ וְהַמְּקוֹמוֹת הַמְּרֻסָּסִים יְיֻשָּׁרוּ לְמַעַן יִמָּלֵא כְבוֹדְךָ אֶת הָאָרֶץ׃",
  // v75 That when the trump shall sound for the dead, we shall be caught up in the cloud to meet thee, that we may ever be with the Lord;
  "75 לְמַעַן בְּהָרִיעַ הַשּׁוֹפָר לַמֵּתִים נִלָּקַח בֶּעָנָן לִקְרָאתְךָ לְמַעַן נִהְיֶה עִם יְהוָה תָּמִיד׃",
  // v76 That our garments may be pure, that we may be clothed upon with robes of righteousness, with palms in our hands, and crowns of glory upon our heads, and reap eternal joy for all our sufferings.
  "76 לְמַעַן יִטְהֲרוּ בִּגְדֵינוּ וְנִלְבַּשׁ אַדְּרוֹת צְדָקָה וְתַמָּרִים בְּיָדֵינוּ וְעַטְרוֹת כָּבוֹד עַל רָאשֵׁינוּ וְנִקְצֹר שִׂמְחַת עוֹלָם עַל כָּל סַבְלוֹתֵינוּ׃",
  // v77 O Lord God Almighty, hear us in these our petitions, and answer us from heaven, thy holy habitation, where thou sittest enthroned, with glory, honor, power, majesty, might, dominion, truth, justice, judgment, mercy, and an infinity of fulness, from everlasting to everlasting.
  "77 יְהוָה אֱלֹהִים שַׁדַּי שְׁמַע אוֹתָנוּ בִּתְחִנּוֹתֵינוּ אֵלֶּה וַעֲנֵנוּ מִן הַשָּׁמַיִם מִשְׁכַּן קָדְשֶׁךָ מֵאֲשֶׁר אַתָּה יוֹשֵׁב עַל כִּסֵּא בְּכָבוֹד הוֹד כֹּחַ גְּדֻלָּה עֹז מֶמְשָׁלָה אֱמֶת צֶדֶק מִשְׁפָּט חֶסֶד וּמְלוֹא אֵין סוֹף מֵעוֹלָם עַד עוֹלָם׃",
  // v78 O hear, O hear, O hear us, O Lord! And answer these petitions, and accept the dedication of this house unto thee, the work of our hands, which we have built unto thy name;
  "78 שְׁמַע שְׁמַע שְׁמַע אוֹתָנוּ יְהוָה וַעֲנֵה אֶת הַתְּחִנּוֹת הָאֵלֶּה וְקַבֵּל אֶת חֲנֻכַּת הַבַּיִת הַזֶּה לְךָ מַעֲשֵׂה יָדֵינוּ אֲשֶׁר בָּנִינוּ לִשְׁמֶךָ׃",
  // v79 And also this church, to put upon it thy name. And help us by the power of thy Spirit, that we may mingle our voices with those bright, shining seraphs around thy throne, with acclamations of praise, singing Hosanna to God and the Lamb!
  "79 וְגַם אֶת הָעֵדָה הַזֹּאת לָשׂוּם עָלֶיהָ אֶת שִׁמְךָ וְעָזְרֵנוּ בְּכֹחַ רוּחֲךָ לְמַעַן נְעָרֵב קוֹלוֹתֵינוּ עִם הַשְּׂרָפִים הַזּוֹהֲרִים הַמְּאִירִים סְבִיב כִּסְאֶךָ בְּתִרְגּוּמוֹת שֶׁבַח קוֹרְאִים הוֹשַׁעְנָא לֵאלֹהִים וְלַשֶּׂה׃",
  // v80 And let these, thine anointed ones, be clothed with salvation, and thy saints shout aloud for joy. Amen, and Amen.
  "80 וְיִלְבְּשׁוּ מְשִׁיחֶיךָ אֵלֶּה יְשׁוּעָה וִיקַדְּשֶׁיךָ יָרִיעוּ בְשִׂמְחָה אָמֵן וְאָמֵן׃"
];

console.log(`D&C 109 Translation: ${dc109Verses.length} verses`);

// ═══════════════════════════════════════════════════════════
// Load glossing dictionary from BOM + PGP + existing DC verses
// ═══════════════════════════════════════════════════════════
const BOM_DIR = path.resolve(__dirname, '..', 'Hebrew BOM', 'verses');
const PGP_DIR = path.join(__dirname, 'pgp_verses');
const DC_DIR = path.join(__dirname, 'dc_verses');

function loadVerseFiles(dir) {
  const dict = {};
  if (!fs.existsSync(dir)) return dict;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
  for (const f of files) {
    const content = fs.readFileSync(path.join(dir, f), 'utf8');
    const pairRegex = /\["([^"]+)","([^"]+)"\]/g;
    let m;
    while ((m = pairRegex.exec(content)) !== null) {
      if (m[1] !== '׃' && m[2] !== '' && m[2] !== '???') {
        dict[m[1]] = m[2];
      }
    }
  }
  return dict;
}

const glossDict = { ...loadVerseFiles(BOM_DIR), ...loadVerseFiles(PGP_DIR), ...loadVerseFiles(DC_DIR) };
console.log(`Glossing dictionary: ${Object.keys(glossDict).length} entries`);

// ═══════════════════════════════════════════════════════════
// Tokenize, gloss, and output
// ═══════════════════════════════════════════════════════════
const PREFIXES = [
  { re: /^וְ/, gl: 'and-' }, { re: /^וַ/, gl: 'and-' }, { re: /^וּ/, gl: 'and-' },
  { re: /^וָ/, gl: 'and-' }, { re: /^וֶ/, gl: 'and-' }, { re: /^וִ/, gl: 'and-' },
  { re: /^הַ/, gl: 'the-' }, { re: /^הָ/, gl: 'the-' }, { re: /^הֶ/, gl: 'the-' },
  { re: /^בְּ/, gl: 'in-' }, { re: /^בַּ/, gl: 'in-the-' }, { re: /^בִּ/, gl: 'in-' },
  { re: /^בָּ/, gl: 'in-the-' }, { re: /^בְ/, gl: 'in-' }, { re: /^בַ/, gl: 'in-' },
  { re: /^בִ/, gl: 'in-' },
  { re: /^לְ/, gl: 'to-' }, { re: /^לַ/, gl: 'to-the-' }, { re: /^לִ/, gl: 'to-' },
  { re: /^לָ/, gl: 'to-the-' }, { re: /^לֶ/, gl: 'to-' },
  { re: /^מִ/, gl: 'from-' }, { re: /^מֵ/, gl: 'from-' }, { re: /^מְ/, gl: 'from-' },
  { re: /^מַ/, gl: 'from-' },
  { re: /^כְּ/, gl: 'as-' }, { re: /^כַּ/, gl: 'as-the-' }, { re: /^כְ/, gl: 'as-' },
  { re: /^כַ/, gl: 'as-' },
  { re: /^שֶׁ/, gl: 'that-' }, { re: /^שֶ/, gl: 'that-' },
];

function tryMaqafCompound(word) {
  if (word.indexOf('\u05BE') < 0) return null;
  const parts = word.split('\u05BE');
  const glossed = parts.map(p => glossDict[p] || null);
  if (glossed.every(g => g !== null)) return glossed.join('-');
  for (const pf of PREFIXES) {
    if (pf.re.test(parts[0])) {
      const stripped = parts[0].replace(pf.re, '');
      if (stripped.length >= 2 && glossDict[stripped]) {
        const restGloss = parts.slice(1).map(p => glossDict[p] || '???').join('-');
        return pf.gl + glossDict[stripped] + '-' + restGloss;
      }
    }
  }
  return null;
}

function tryPrefixStrip(word) {
  for (const pf of PREFIXES) {
    if (pf.re.test(word)) {
      const stripped = word.replace(pf.re, '');
      if (stripped.length >= 2 && glossDict[stripped]) return pf.gl + glossDict[stripped];
    }
  }
  for (const pf1 of PREFIXES) {
    if (pf1.re.test(word)) {
      const after1 = word.replace(pf1.re, '');
      for (const pf2 of PREFIXES) {
        if (pf2.re.test(after1)) {
          const after2 = after1.replace(pf2.re, '');
          if (after2.length >= 2 && glossDict[after2]) return pf1.gl + pf2.gl + glossDict[after2];
        }
      }
    }
  }
  return null;
}

function glossWord(word) {
  if (glossDict[word]) return glossDict[word];
  const maqaf = tryMaqafCompound(word);
  if (maqaf) return maqaf;
  const prefix = tryPrefixStrip(word);
  if (prefix) return prefix;
  return '???';
}

function toHebNum(n) {
  if (n <= 0) return '';
  const ones = ['','א','ב','ג','ד','ה','ו','ז','ח','ט'];
  const tens = ['','י','כ','ל','מ','נ','ס','ע','פ','צ'];
  const hundreds = ['','ק','ר','ש','ת'];
  if (n === 15) return 'טו';
  if (n === 16) return 'טז';
  let result = '';
  if (n >= 100) {
    const h = Math.floor(n / 100);
    if (h <= 4) result += hundreds[h];
    else result += 'ת' + hundreds[h - 4];
    n %= 100;
  }
  if (n >= 10) { result += tens[Math.floor(n / 10)]; n %= 10; }
  if (n > 0) result += ones[n];
  return result;
}

// Process verses
let totalWords = 0, glossedWords = 0, unknownWords = 0;
const processedVerses = [];

for (const line of dc109Verses) {
  const verseMatch = line.match(/^(\d+)\s+(.+)/);
  if (!verseMatch) { console.error('Bad verse line:', line.substring(0, 50)); continue; }
  const num = parseInt(verseMatch[1], 10);
  const text = verseMatch[2];
  const tokens = text.split(/\s+/).filter(w => w.length > 0);
  const words = [];
  for (const tok of tokens) {
    if (tok === '—' || tok === '–' || /^[A-Za-z0-9.,;:!?'"()\-]+$/.test(tok)) continue;
    const gloss = glossWord(tok);
    words.push([tok, gloss]);
    totalWords++;
    if (gloss === '???') unknownWords++;
    else glossedWords++;
  }
  words.push(['׃', '']);
  processedVerses.push({ num, words });
}

const pct = totalWords > 0 ? (glossedWords / totalWords * 100).toFixed(1) : 0;
console.log(`Glossed: ${glossedWords}/${totalWords} (${pct}%)`);
console.log(`Unknown: ${unknownWords}`);

// Write verse JS file
let js = '// dc_verses/dc109.js — D&C Section 109 (Kirtland Temple Dedicatory Prayer)\n';
js += '(function() {\n';
js += 'var dc109_ch1Verses = [\n';
for (const v of processedVerses) {
  const hebNum = toHebNum(v.num);
  const wordsStr = v.words.map(([h, g]) => `["${h.replace(/"/g, '\\"')}","${g.replace(/"/g, '\\"')}"]`).join(',');
  js += `  { num: "${hebNum}", words: [\n    ${wordsStr}\n  ]},\n`;
}
js += '];\n';
js += "renderVerseSet(dc109_ch1Verses, 'dc109-ch1-verses');\n";
js += '})();\n';

const outPath = path.join(__dirname, 'dc_verses', 'dc109.js');
fs.writeFileSync(outPath, js, 'utf8');
console.log(`\nWrote ${outPath} (${js.split('\n').length} lines)`);
