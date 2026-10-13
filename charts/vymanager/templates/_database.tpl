{{- define "vymanager.databaseSecretName" -}}
{{- if eq .Values.database.mode "external" -}}
{{- required "database.external.existingSecret is required when database.mode=external" .Values.database.external.existingSecret -}}
{{- else -}}
{{- printf "%s-postgresql" (include "vymanager.fullname" .) -}}
{{- end -}}
{{- end }}

{{- define "vymanager.databaseUrlSecretKey" -}}
{{- if eq .Values.database.mode "external" -}}
{{- .Values.database.external.secretKey -}}
{{- else -}}
DATABASE_URL
{{- end -}}
{{- end }}

{{- define "vymanager.postgresqlServiceName" -}}
{{- printf "%s-postgresql" (include "vymanager.fullname" .) -}}
{{- end }}

