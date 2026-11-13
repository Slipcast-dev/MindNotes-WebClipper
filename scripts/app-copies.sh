# Копии выпусков в репозитории MindNotes (подключается из release.sh и remove-app-copies.sh).
# MindNotes до 1.7.0 ищет выпуски плагина только в репозитории приложения, MindNotes 1.7.0+ — сразу здесь.
# Копии нужны, пока остаются MindNotes до 1.7.0. Узнать, у кого какая версия, нельзя (MindNotes ничего не сообщает),
# поэтому правило по времени: 1.5.x–1.6.x работают на тех же Mac, что 1.7.0, и обновляются до неё сами;
# через COPIES_GRACE_DAYS дней после выхода MindNotes 1.7.0 копии больше не делаются и их можно убрать.
APP_REPO=$(/usr/bin/plutil -extract app.repository raw -o - contracts/plugin-api.json)
APP_BRANCH=personal-ru
COPIES_UNTIL_APP=1.7.0
COPIES_GRACE_DAYS=${COPIES_GRACE_DAYS:-60}

# Сколько дней назад вышла первая MindNotes >= COPIES_UNTIL_APP; -1 — ещё не вышла.
days_since_app_without_copies() {
    gh api "repos/$APP_REPO/releases?per_page=100" --jq "[.[] | select(.draft == false and .prerelease == false)
        | select(.tag_name | test(\"^v[0-9]+\\\\.[0-9]+\"))
        | select((.tag_name[1:] | split(\".\") | map(tonumber? // 0)) >= ($(echo $COPIES_UNTIL_APP | sed 's/\./,/g' | sed 's/^/[/;s/$/]/')))
        | .published_at | fromdateiso8601] | if length == 0 then -1 else ((now - min) / 86400 | floor) end"
}

# Копии больше не нужны: MindNotes 1.7.0 вышла не меньше COPIES_GRACE_DAYS дней назад.
copies_no_longer_needed() {
    local days; days=$(days_since_app_without_copies)
    (( days >= COPIES_GRACE_DAYS ))
}
