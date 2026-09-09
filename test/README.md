# Le prove

Stanno qui dentro perché fino a oggi vivevano nella cartella temporanea di
una sessione di lavoro: quando la macchina si è riavviata sono sparite tutte
insieme. Nel repository non spariscono più.

Non fanno parte del sito: nessuna pagina le carica, e toglierle non cambia
niente di quello che si vede sul totem o sul gestionale.

## Come si eseguono

    node test/esegui.js                # tutte
    node test/esegui.js vetrina        # solo quelle che si chiamano così

Serve [playwright](https://playwright.dev). Se sta in un posto suo:

    NODE_PATH=/percorso/node_modules node test/esegui.js

Se Chromium sta in un posto suo:

    CHROME_PATH=/percorso/chrome node test/esegui.js

Esce con `0` se è tutto verde e con `1` al primo rosso, così si può attaccare
a un controllo automatico senza cambiare niente.

## Cosa prova, e perché

**`vetrina.test.js` — la home del totem, su cinque formati.**
L'ordine della colonna (prima «cosa hai fatto oggi», poi «cosa succede
adesso»), il rettangolo intorno a ogni sezione, i titoli con occhiello.
E soprattutto lo **spazio**: la colonna ha un'altezza fissa e dentro ci sta
tutto per pochi punti, quindi ogni parola in più la fa sbordare — e su un 49
pollici sbordare vuol dire che il tasto del check-in finisce sotto il vetro.
Il riquadro del pensiero ha `overflow:hidden`: una frase troppo lunga non dà
errore, sparisce a metà. Per questo si misurano tutti e cinque i pensieri.

**`macchinari.test.js` — cosa diciamo dei macchinari, in tutt'e due i posti.**
La regola: chi legge ha appena finito di allenarsi, e nessuna frase deve
suonare come una mancanza. Niente «ti lascia i muscoli in debito», niente
«l'indolenzimento arriva domani». Zenith non è la parte che mancava, è la
cosa che fa rendere di più quella che ha già fatto.
Poi i fatti che il centro vuole che si sappiano — le tre ore di sala pesi
dell'EMS, la postura, l'addome e gli infrarossi del Vacutherm — e che la
vetrina e il gestionale li raccontino **uguali**: se si cambia solo la
vetrina, l'operatore dice al cliente una versione diversa da quella che il
cliente ha appena letto.

**`domande.test.js` — le domande, e la riga dei tasti sotto.**
Il tasto del check-in vale mezza riga sempre: quando accanto ha un tasto solo
e quando ne ha due. Se si restringesse ogni volta che compare un'altra
strada, la strada nuova sembrerebbe più importante di quella giusta. Nel quiz
vale la regola opposta, ed è voluta: lì AVANTI comanda e INDIETRO è la
scappatoia. Poi le parole di alcune risposte, scelte a voce e da tenere
ferme — e quelle scartate, da tenere fuori.

**`anagrafica.test.js` — la condizione per salvare una scheda.**
Telefono obbligatorio e tutte e quindici le domande dell'anamnesi risposte.
La parte che conta è quella che non si vede: una risposta lasciata in bianco
non deve diventare «no» da sola. Una scheda così è peggio di una incompleta,
perché sembra completa — dice «nessuna trombosi» a nome di uno a cui nessuno
l'ha chiesto.

**`operatori.test.js` — chi segue questa seduta.**
I nomi stanno in fila, uno accanto all'altro, come sul totem. Le due cose che
si rompono da sole se qualcuno tocca la griglia sono il numero di file (tre
nomi devono starci in una) e i nomi lunghi, che in una colonna stretta escono
dalla scheda senza dare errore. Provato con due, tre e sei operatori, su
telefono stretto e su desktop.

**`protocollo.test.js` — i due motori devono dare la stessa risposta.**
Il protocollo si calcola in due posti: `buildProtocol()` nel gestionale e
`costruisciProtocollo()` nella vetrina. Sono due copie scritte a mano della
stessa logica, e due copie a mano divergono — sempre, e in silenzio. Il
giorno in cui divergono, il totem promette al cliente una seduta e il
gestionale ne prepara un'altra. Qui si passano 14.400 combinazioni di
risposte a tutt'e due, in tre fasce orarie, e si confronta quello che comanda
davvero la macchina: programma, famiglia e i nove parametri. Le frasi del
«perché» no: quelle possono essere scritte con parole diverse senza che
cambi niente.

## Una nota sulle misure

Sulla vetrina il foglio è disegnato su una tela da 1080 punti e poi
rimpicciolito con `transform:scale()`. `getBoundingClientRect()` restituisce
i punti dello schermo, non quelli della tela, e quindi **mente**: le stesse
asserzioni passano sul totem e falliscono sul telefono senza che sia
cambiato niente. Si misura con `offsetTop` / `offsetHeight` / `offsetWidth`,
che sono in punti di tela, oppure con `getBBox()` dentro un SVG.
