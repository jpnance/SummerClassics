#!/bin/sh

teams=(
	'tb' 'bos' 'nyy' 'tor' 'bal'
	'chw' 'cle' 'det' 'kc' 'min'
	'hou' 'sea' 'ath' 'laa' 'tex'
	'atl' 'phi' 'nym' 'mia' 'wsh'
	'mil' 'stl' 'cin' 'chc' 'pit'
	'sf' 'lad' 'sd' 'col' 'ari'
)

for team in "${teams[@]}"; do
	curl "https://a.espncdn.com/combiner/i?img=/i/teamlogos/mlb/500/scoreboard/${team}.png&h=80&w=80" > ../public/images/${team}.png
done

mv ../public/images/ari.png ../public/images/az.png
mv ../public/images/chw.png ../public/images/cws.png
