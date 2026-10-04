{{- define "vymanager.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "vymanager.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{- define "vymanager.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "vymanager.labels" -}}
helm.sh/chart: {{ include "vymanager.chart" . }}
app.kubernetes.io/name: {{ include "vymanager.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{- define "vymanager.selectorLabels" -}}
app.kubernetes.io/name: {{ include "vymanager.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{- define "vymanager.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "vymanager.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{- define "vymanager.frontendImage" -}}
{{- printf "%s:%s" .Values.frontend.image.repository .Values.frontend.image.tag }}
{{- end }}

{{- define "vymanager.backendImage" -}}
{{- printf "%s:%s" .Values.backend.image.repository .Values.backend.image.tag }}
{{- end }}

{{- define "vymanager.migrationImage" -}}
{{- $repository := default .Values.frontend.image.repository .Values.migrations.image.repository -}}
{{- $tag := default .Values.frontend.image.tag .Values.migrations.image.tag -}}
{{- printf "%s:%s" $repository $tag }}
{{- end }}

{{- define "vymanager.pullPolicyFor" -}}
{{- $tag := required "image tag is required" .tag -}}
{{- $policy := required "image pullPolicy is required" .policy -}}
{{- $pinned := or (regexMatch "^(v|V)?[0-9]+\\.[0-9]+" $tag) (regexMatch "^sha256:[0-9a-fA-F]+$" $tag) (regexMatch "^[0-9a-f]{40}$" $tag) -}}
{{- if and (not $pinned) (ne $policy "Never") -}}
Always
{{- else -}}
{{- $policy -}}
{{- end -}}
{{- end }}

{{- define "vymanager.migrationPullPolicy" -}}
{{- $tag := default .Values.frontend.image.tag .Values.migrations.image.tag -}}
{{- $policy := default .Values.frontend.image.pullPolicy .Values.migrations.image.pullPolicy -}}
{{- include "vymanager.pullPolicyFor" (dict "tag" $tag "policy" $policy) }}
{{- end }}

