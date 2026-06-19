# Configuración AWS para el proyecto base

> Pasos para configurar las credenciales AWS necesarias para ejecutar `sst dev` y `sst deploy` desde tu máquina local. Hazlo **una vez** por máquina.

## 1. Instalar AWS CLI v2

### Linux

```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
aws --version    # → aws-cli/2.x.x ...
```

### macOS

```bash
brew install awscli
aws --version
```

### Windows

Descarga el instalador MSI desde https://aws.amazon.com/cli/ y ejecútalo.

---

## 2. Opción A — AWS IAM Identity Center (SSO) [recomendada]

Esta es la opción recomendada para equipos. No usa credenciales estáticas (más seguro) y las credenciales rotan automáticamente cada 8-12 horas.

### Prerrequisitos
- Tu administrador AWS ya creó la AWS Organization con IAM Identity Center habilitado.
- Te asignaron un usuario en Identity Center con permisos al account de desarrollo (`AdministratorAccess` o un set custom).
- Tu admin te dio: **SSO start URL** (algo como `https://miempresa.awsapps.com/start`) y la **region** del Identity Center (típicamente `us-east-1`).

### Configurar perfil SSO

```bash
aws configure sso
```

El comando te pregunta interactivamente. Respuestas típicas:

```
SSO session name (Recommended): base-apps
SSO start URL: https://miempresa.awsapps.com/start
SSO region: us-east-1
SSO registration scopes: sso:account:access            # default ENTER

# Se abre el navegador → autorizar el dispositivo

# Después del login, el CLI lista cuentas/roles a las que tienes acceso
# Elige el account de desarrollo
There are N AWS accounts available to you.
> Selecciona el dev account

# Elige el role/permission set
There are N roles available to you.
> Selecciona AdministratorAccess (o el que te asignaron)

CLI default client Region: us-east-1
CLI default output format: json
CLI profile name: base-apps-dev                          # nombre del perfil local
```

### Login posterior

Cada vez que las credenciales expiren (cada 8-12h), refrescas:

```bash
aws sso login --profile base-apps-dev
```

### Verificar

```bash
aws sts get-caller-identity --profile base-apps-dev
```

Debes ver algo como:

```json
{
    "UserId": "AROA...XXXX:cristian@empresa.com",
    "Account": "123456789012",
    "Arn": "arn:aws:sts::123456789012:assumed-role/AWSReservedSSO_AdministratorAccess_xxx/cristian@empresa.com"
}
```

### Activar el perfil por default (para que no tengas que pasar `--profile` cada vez)

Opción 1: variable de entorno (recomendado en tu shell rc):

```bash
# En ~/.bashrc o ~/.zshrc
export AWS_PROFILE=base-apps-dev
```

Opción 2: por sesión:

```bash
export AWS_PROFILE=base-apps-dev
```

Verifica:

```bash
aws sts get-caller-identity   # sin --profile, debe funcionar
```

---

## 3. Opción B — IAM Access Keys (sólo si NO hay Identity Center)

> No recomendada: credenciales estáticas son menos seguras. Úsala sólo si tu organización aún no tiene SSO.

### Crear las keys

1. Login en consola AWS → IAM → Users → tu usuario
2. Security credentials → Create access key
3. Use case: **CLI**
4. Copia el `Access Key ID` y `Secret Access Key`

### Configurar perfil

```bash
aws configure --profile base-apps-dev
```

Respuestas:

```
AWS Access Key ID: AKIA...
AWS Secret Access Key: ...
Default region name: us-east-1
Default output format: json
```

Activar como default:

```bash
export AWS_PROFILE=base-apps-dev    # añade a ~/.bashrc o ~/.zshrc
```

Verificar:

```bash
aws sts get-caller-identity
```

---

## 4. Configurar Node.js, pnpm y herramientas de SST

```bash
# Node.js 22 LTS (recomendado)
nvm install 22
nvm use 22

# pnpm
npm install -g pnpm@9

# SST CLI (se instala con dependencies del proyecto, pero verifica)
cd <ruta-al-repo>          # raíz del monorepo Base-Projects-SST
pnpm install
pnpm sst version    # → sst 4.x.x
```

---

## 5. Verificación final antes de `sst dev`

```bash
# 1. AWS responde
aws sts get-caller-identity

# 2. Region correcta
aws configure get region    # → us-east-1

# 3. Perfil activo
echo $AWS_PROFILE           # → base-apps-dev

# 4. SST detecta credenciales
cd <ruta-al-repo>
pnpm sst version
```

Si los 4 pasos pasan, ya puedes correr:

```bash
pnpm sst dev --stage $(whoami)
```

---

## 6. Permisos mínimos requeridos en AWS

Si tu admin necesita saber qué permisos darte, los mínimos para usar SST en un account de desarrollo son:

- `AdministratorAccess` (la opción más simple para desarrollo)
- O un permission set custom que cubra:
  - VPC, EC2 (subnets, security groups)
  - ECS, ECR
  - Lambda
  - API Gateway
  - IAM (crear roles para Lambda/ECS)
  - SSM Parameter Store
  - S3 (para state SST)
  - CloudWatch Logs
  - SNS/SQS/EventBridge
  - Route 53 (si usas dominios custom)

Para **stages personales en account de desarrollo**, `AdministratorAccess` es lo más común. Para **prod**, se restringe a un permission set más estricto (operaciones de deploy únicamente, no destrucción).

---

## 7. Troubleshooting común

### "Unable to locate credentials"
- Verifica `aws sts get-caller-identity` directo
- Confirma que `AWS_PROFILE` esté seteado
- Si usas SSO, vuelve a correr `aws sso login --profile <perfil>`

### "The security token included in the request is expired"
- Tu sesión SSO expiró. Corre `aws sso login --profile <perfil>` de nuevo

### `sst dev` no encuentra credenciales aunque `aws sts` funcione
- SST usa el SDK estándar. Verifica que el perfil esté en `~/.aws/credentials` o `~/.aws/config`
- Para SSO, asegúrate que `AWS_PROFILE` apunta al perfil SSO configurado

### "AccessDenied" al crear recursos
- Tu permission set no tiene permisos suficientes
- Pide a tu admin el equivalente a `AdministratorAccess` para el account de desarrollo

---

## Próximos pasos

Una vez configurado AWS, valida end-to-end con el primer `sst dev --stage <usuario>` (ver [08-desarrollo-local.md](./08-desarrollo-local.md)).
