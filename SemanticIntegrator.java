import java.io.FileWriter;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

public class SemanticIntegrator {

    // Output
    private static final String OUT_TTL = "semantic_output.ttl";
    private static final String OUT_RDF = "semantic_output.rdf";
    private static final String OUT_YAML = "semantic_mapping.yaml";

    // IDMP namespace
    private static final String NS_IDMP = "http://purl.org/onto/idmp/";
    private static final String NS_ISO11238 = "http://purl.org/onto/idmp/iso11238/";
    private static final String NS_PHARM = "http://pharmacy.interoperability.com/";

    static class DrugProduct {
        Integer id; String brand; String generic; String substance;
        Integer strengthMg; String form; String route;
        String manufacturer; String market; LocalDateTime updated;
    }
    static class Medicine {
        Integer id; String trade; String substance;
        BigDecimal doseValue; String doseUnit;
        String form; String route; String org; String market; LocalDateTime updated;
    }
    static class Normalized {
        String brand; String substanceIsoUri; String substanceLabel;
        Integer strengthMg; String form; String route;
        String manufacturer; String market;
        String source; Object original;
        String key() { return substanceIsoUri + "|" + strengthMg + "|" + form + "|" + route; }
    }
    static class Match {
        Normalized a; Normalized b; double score; String method; boolean verified;
    }

    static List<DrugProduct> sampleDb1() {
        List<DrugProduct> l = new ArrayList<>();
        l.add(dp(1,"Tylenol","acetaminophen","acetaminophen",500,"tablet","oral","J&J","US"));
        l.add(dp(2,"Panadol","paracetamol","paracetamol",500,"tablet","oral","GSK","GB"));
        l.add(dp(3,"Advil","ibuprofen","ibuprofen",200,"tablet","oral","Pfizer","US"));
        return l;
    }
    static List<Medicine> sampleDb2() {
        List<Medicine> l = new ArrayList<>();
        l.add(med(1,"Tylenol","acetaminophen", new BigDecimal("0.500"),"g","tab","PO","J&J","US"));
        l.add(med(2,"Panadol","paracetamol", new BigDecimal("500"),"mg","tab","by mouth","GSK","GB"));
        l.add(med(3,"Advil","ibuprofen", new BigDecimal("200"),"mg","tab","PO","Pfizer","US"));
        return l;
    }

    static String normalizeBrand(String s){ return s==null?"":s.trim().replaceAll("\\s+"," "); }
    static String normalizeRoute(String s){
        if(s==null) return "";
        String v=s.trim().toLowerCase();
        if(v.equals("po")||v.equals("by mouth")||v.equals("oral")) return "oral";
        return v;
    }
    static String normalizeForm(String s){
        if(s==null) return "";
        String v=s.trim().toLowerCase();
        switch(v){case "tab": return "tablet"; case "cap": return "capsule"; case "susp": return "suspension"; default: return v;}
    }
    static int toMg(BigDecimal val, String unit){
        if(val==null) return 0;
        String u = unit==null?"mg":unit.trim().toLowerCase();
        if(u.equals("g")) return val.multiply(new BigDecimal("1000")).intValue();
        return val.intValue();
    }
    static String isoUri(String substanceLower){
        switch(substanceLower){
            case "acetaminophen": case "paracetamol": return NS_ISO11238 + "Substance_Acetaminophen";
            case "ibuprofen": return NS_ISO11238 + "Substance_Ibuprofen";
            default: return NS_ISO11238 + "Substance_" + substanceLower.replaceAll("\\s+","_");
        }
    }
    static String isoLabel(String substanceLower){
        switch(substanceLower){
            case "acetaminophen": return "Acetaminophen (Paracetamol)";
            case "paracetamol": return "Paracetamol (Acetaminophen)";
            case "ibuprofen": return "Ibuprofen";
            default: return substanceLower;
        }
    }

    static Normalized norm(DrugProduct p){
        Normalized n = new Normalized();
        n.brand = normalizeBrand(p.brand);
        String sub = p.substance.toLowerCase();
        n.substanceIsoUri = isoUri(sub);
        n.substanceLabel = isoLabel(sub);
        n.strengthMg = p.strengthMg;
        n.form = normalizeForm(p.form);
        n.route = normalizeRoute(p.route);
        n.manufacturer = p.manufacturer;
        n.market = p.market.toUpperCase();
        n.source = "db1";
        n.original = p;
        return n;
    }
    static Normalized norm(Medicine m){
        Normalized n = new Normalized();
        n.brand = normalizeBrand(m.trade);
        String sub = m.substance.toLowerCase();
        n.substanceIsoUri = isoUri(sub);
        n.substanceLabel = isoLabel(sub);
        n.strengthMg = toMg(m.doseValue, m.doseUnit);
        n.form = normalizeForm(m.form);
        n.route = normalizeRoute(m.route);
        n.manufacturer = m.org;
        n.market = m.market.toUpperCase();
        n.source = "db2";
        n.original = m;
        return n;
    }

    static double sim(String a,String b){
        if(a==null||b==null) return 0;
        if(a.equalsIgnoreCase(b)) return 1.0;
        int max=Math.max(a.length(), b.length()); if(max==0) return 1.0;
        int dist=lev(a.toLowerCase(), b.toLowerCase());
        return 1.0 - (double)dist/max;
    }
    static int lev(String a,String b){
        int[][]dp=new int[a.length()+1][b.length()+1];
        for(int i=0;i<=a.length();i++) dp[i][0]=i;
        for(int j=0;j<=b.length();j++) dp[0][j]=j;
        for(int i=1;i<=a.length();i++){
            for(int j=1;j<=b.length();j++){
                int cost=a.charAt(i-1)==b.charAt(j-1)?0:1;
                dp[i][j]=Math.min(Math.min(dp[i-1][j]+1, dp[i][j-1]+1), dp[i-1][j-1]+cost);
            }
        }
        return dp[a.length()][b.length()];
    }
    static Match match(Normalized a, Normalized b){
        Match m=new Match(); m.a=a; m.b=b;
        if(a.key().equals(b.key())){
            double brandSim = sim(a.brand,b.brand);
            if(brandSim>=0.85){ m.score=brandSim; m.method="exact+brand"; m.verified=true; return m; }
            if(brandSim>=0.70){ m.score=brandSim; m.method="exact+brand_fuzzy"; m.verified=true; return m; }
        }
        double formSim = sim(a.form,b.form);
        double routeSim = sim(a.route,b.route);
        double brandSim = sim(a.brand,b.brand);
        double strengthSim = Math.abs(a.strengthMg - b.strengthMg) <= 1 ? 1.0 : 0.0;
        double comp = 0.25*brandSim + 0.35*strengthSim + 0.2*formSim + 0.2*routeSim;
        if(comp>=0.9){ m.score=comp; m.method="fuzzy_composite"; m.verified=true; return m; }
        if(comp>=0.75){ m.score=comp; m.method="fuzzy_composite_low"; m.verified=false; return m; }
        m.score=0; m.method="none"; m.verified=false; return m;
    }

    static void writeTTL(List<Normalized> n1, List<Normalized> n2, List<Match> matches, String path) throws IOException{
        try(FileWriter w=new FileWriter(path)){
            w.write("@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n");
            w.write("@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n");
            w.write("@prefix owl: <http://www.w3.org/2002/07/owl#> .\n");
            w.write("@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .\n");
            w.write("@prefix idmp: <"+NS_IDMP+"> .\n");
            w.write("@prefix iso11238: <"+NS_ISO11238+"> .\n");
            w.write("@prefix pharm: <"+NS_PHARM+"> .\n\n");

            for(Normalized n: concat(n1,n2)){
                String local = (n.source.equals("db1")?"product_db1_":"medicine_db2_") + getId(n);
                w.write("pharm:"+local+"\n");
                w.write("    a idmp:PharmaceuticalProduct ;\n");
                w.write("    idmp:brandName \""+escape(n.brand)+"\" ;\n");
                w.write("    idmp:hasSubstance iso11238:"+n.substanceIsoUri.substring(NS_ISO11238.length())+" ;\n");
                w.write("    idmp:hasStrength [ a idmp:Strength ; idmp:strengthValue "+n.strengthMg+" ; idmp:strengthUnit \"mg\" ] ;\n");
                w.write("    idmp:hasDosageForm [ a idmp:DosageForm ; idmp:dosageFormName \""+escape(n.form)+"\" ] ;\n");
                w.write("    idmp:hasRouteOfAdministration [ a idmp:RouteOfAdministration ; idmp:routeName \""+escape(n.route)+"\" ] ;\n");
                if(n.manufacturer!=null) w.write("    idmp:manufacturedBy [ a idmp:Manufacturer ; idmp:manufacturerName \""+escape(n.manufacturer)+"\" ] ;\n");
                if(n.market!=null) w.write("    idmp:availableIn [ a idmp:Market ; idmp:marketCode \""+escape(n.market)+"\" ] ;\n");
                w.write("    .\n\n");
            }
            for(String sub : new HashSet<>(Arrays.asList("Acetaminophen","Paracetamol","Ibuprofen"))){
                String uri = sub.equals("Paracetamol")? "Substance_Acetaminophen" : "Substance_"+sub;
                String lbl = sub.equals("Paracetamol")? "Paracetamol (Acetaminophen)" : sub;
                w.write("iso11238:"+uri+" a idmp:Substance ; rdfs:label \""+lbl+"\" ; owl:sameAs iso11238:Substance_Acetaminophen .\n");
            }
            for(Match m: matches){
                if(m.score<=0) continue;
                String mid = "match_"+getId(m.a)+"_"+getId(m.b);
                w.write("\npharm:"+mid+"\n");
                w.write("    owl:sameAs pharm:"+(m.a.source.equals("db1")?"product_db1_":"medicine_db2_")+getId(m.a)+" ;\n");
                w.write("    owl:sameAs pharm:"+(m.b.source.equals("db1")?"product_db1_":"medicine_db2_")+getId(m.b)+" ;\n");
                // FIX: Removed illegal escape backslashes
                w.write("    rdfs:comment \"method="+m.method+", score="+String.format("%.2f",m.score)+", verified="+m.verified+"\" .\n");
            }
        }
    }

    static void writeRdfXml(List<Normalized> n1, List<Normalized> n2, List<Match> matches, String path) throws IOException{
        try(FileWriter w=new FileWriter(path)){
            w.write("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
            w.write("<rdf:RDF xmlns:rdf=\"http://www.w3.org/1999/02/22-rdf-syntax-ns#\" ");
            w.write("xmlns:rdfs=\"http://www.w3.org/2000/01/rdf-schema#\" ");
            w.write("xmlns:owl=\"http://www.w3.org/2002/07/owl#\" ");
            w.write("xmlns:xsd=\"http://www.w3.org/2001/XMLSchema#\" ");
            w.write("xmlns:idmp=\""+NS_IDMP+"\" xmlns:iso11238=\""+NS_ISO11238+"\" xmlns:pharm=\""+NS_PHARM+"\">\n");

            for(Normalized n: concat(n1,n2)){
                String local = (n.source.equals("db1")?"product_db1_":"medicine_db2_")+getId(n);
                w.write("  <rdf:Description rdf:about=\"pharm:"+local+"\">\n");
                w.write("    <rdf:type rdf:resource=\""+NS_IDMP+"PharmaceuticalProduct\"/>\n");
                w.write("    <idmp:brandName>"+xml(n.brand)+"</idmp:brandName>\n");
                w.write("    <idmp:hasSubstance rdf:resource=\"iso11238:"+n.substanceIsoUri.substring(NS_ISO11238.length())+"\"/>\n");
                w.write("    <idmp:hasStrength>\n");
                w.write("      <rdf:Description>\n");
                w.write("        <rdf:type rdf:resource=\""+NS_IDMP+"Strength\"/>\n");
                w.write("        <idmp:strengthValue rdf:datatype=\"http://www.w3.org/2001/XMLSchema#integer\">"+n.strengthMg+"</idmp:strengthValue>\n");
                w.write("        <idmp:strengthUnit>mg</idmp:strengthUnit>\n");
                w.write("      </rdf:Description>\n");
                w.write("    </idmp:hasStrength>\n");
                w.write("    <idmp:hasDosageForm><rdf:Description><rdf:type rdf:resource=\""+NS_IDMP+"DosageForm\"/><idmp:dosageFormName>"+xml(n.form)+"</idmp:dosageFormName></rdf:Description></idmp:hasDosageForm>\n");
                w.write("    <idmp:hasRouteOfAdministration><rdf:Description><rdf:type rdf:resource=\""+NS_IDMP+"RouteOfAdministration\"/><idmp:routeName>"+xml(n.route)+"</idmp:routeName></rdf:Description></idmp:hasRouteOfAdministration>\n");
                if(n.manufacturer!=null) w.write("    <idmp:manufacturedBy><rdf:Description><rdf:type rdf:resource=\""+NS_IDMP+"Manufacturer\"/><idmp:manufacturerName>"+xml(n.manufacturer)+"</idmp:manufacturerName></rdf:Description></idmp:manufacturedBy>\n");
                if(n.market!=null) w.write("    <idmp:availableIn><rdf:Description><rdf:type rdf:resource=\""+NS_IDMP+"Market\"/><idmp:marketCode>"+xml(n.market)+"</idmp:marketCode></rdf:Description></idmp:availableIn>\n");
                w.write("  </rdf:Description>\n");
            }
            for(Match m: matches){
                if(m.score<=0) continue;
                String mid="match_"+getId(m.a)+"_"+getId(m.b);
                String aUri="pharm:"+(m.a.source.equals("db1")?"product_db1_":"medicine_db2_")+getId(m.a);
                String bUri="pharm:"+(m.b.source.equals("db1")?"product_db1_":"medicine_db2_")+getId(m.b);
                w.write("  <rdf:Description rdf:about=\"pharm:"+mid+"\">\n");
                w.write("    <owl:sameAs rdf:resource=\""+aUri+"\"/>\n");
                w.write("    <owl:sameAs rdf:resource=\""+bUri+"\"/>\n");
                // FIX: Removed illegal escape backslashes
                w.write("    <rdfs:comment>method="+xml(m.method)+", score="+String.format("%.2f",m.score)+", verified="+m.verified+"</rdfs:comment>\n");
                w.write("  </rdf:Description>\n");
            }
            w.write("</rdf:RDF>\n");
        }
    }

    static void writeYAML(List<Match> matches, String path) throws IOException{
        Map<String,Object> root=new LinkedHashMap<>();
        root.put("description","Semantic mapping across DB1/DB2 using ISO11238 (IDMP)");
        root.put("total_matches", matches.size());
        long verified = matches.stream().filter(m->m.verified).count();
        root.put("verified_matches", verified);
        double avg = matches.stream().mapToDouble(m->m.score).average().orElse(0);
        root.put("average_score", String.format("%.2f",avg));
        List<Map<String,Object>> items=new ArrayList<>();
        for(Match m: matches){
            if(m.score<=0) continue;
            Map<String,Object> mm=new LinkedHashMap<>();
            mm.put("method", m.method);
            mm.put("score", String.format("%.2f",m.score));
            mm.put("verified", m.verified);
            mm.put("db1_brand", m.a.source.equals("db1")? m.a.brand : m.b.brand);
            mm.put("db2_brand", m.b.source.equals("db2")? m.b.brand : m.a.brand);
            mm.put("substance_iso_uri", m.a.substanceIsoUri);
            mm.put("strength_mg", m.a.strengthMg);
            mm.put("form", m.a.form);
            mm.put("route", m.a.route);
            items.add(mm);
        }
        root.put("matches", items);
        try(FileWriter w=new FileWriter(path)){
            dumpYaml(root, w, 0);
        }
    }
    static void dumpYaml(Object o, FileWriter w, int ind) throws IOException{
        String pad="  ".repeat(ind);
        if(o instanceof Map){
            for(Map.Entry<?,?> e: ((Map<?,?>)o).entrySet()){
                w.write(pad+e.getKey()+":");
                if(e.getValue() instanceof Map || e.getValue() instanceof List){
                    w.write("\n"); dumpYaml(e.getValue(), w, ind+1);
                } else {
                    w.write(" "+String.valueOf(e.getValue())+"\n");
                }
            }
        } else if(o instanceof List){
            for(Object v: (List<?>)o){
                w.write(pad+"-");
                if(v instanceof Map || v instanceof List){
                    w.write("\n"); dumpYaml(v,w,ind+1);
                } else {
                    w.write(" "+String.valueOf(v)+"\n");
                }
            }
        } else {
            w.write(pad+String.valueOf(o)+"\n");
        }
    }

    static String escape(String s){ return s==null? "": s.replace("\"","\\\"").replace("\n","\\n"); }
    static String xml(String s){ if(s==null)return ""; return s.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;").replace("\"","&quot;").replace("'","&apos;"); }
    static int getId(Normalized n){
        if(n.original instanceof DrugProduct) return ((DrugProduct)n.original).id;
        if(n.original instanceof Medicine) return ((Medicine)n.original).id;
        return 0;
    }
    static <T> List<T> concat(List<T>a,List<T>b){ List<T> r=new ArrayList<>(a); r.addAll(b); return r; }
    static DrugProduct dp(int id,String brand,String gen,String sub,int mg,String form,String route,String manu,String market){
        DrugProduct d=new DrugProduct(); d.id=id; d.brand=brand; d.generic=gen; d.substance=sub; d.strengthMg=mg; d.form=form; d.route=route; d.manufacturer=manu; d.market=market; d.updated=LocalDateTime.now(); return d;
    }
    static Medicine med(int id,String trade,String sub,BigDecimal val,String unit,String form,String route,String org,String market){
        Medicine m=new Medicine(); m.id=id; m.trade=trade; m.substance=sub; m.doseValue=val; m.doseUnit=unit; m.form=form; m.route=route; m.org=org; m.market=market; m.updated=LocalDateTime.now(); return m;
    }

    public static void main(String[] args) {
        try{
            System.out.println("=== Semantic Integrator (IDMP / ISO11238) ===");
            List<DrugProduct> db1 = sampleDb1();
            List<Medicine> db2 = sampleDb2();

            List<Normalized> n1=new ArrayList<>(); for(DrugProduct p: db1) n1.add(norm(p));
            List<Normalized> n2=new ArrayList<>(); for(Medicine m: db2) n2.add(norm(m));

            List<Match> matches=new ArrayList<>();
            for(Normalized a: n1) for(Normalized b: n2){
                if(!a.substanceIsoUri.equals(b.substanceIsoUri)) continue; 
                Match m=match(a,b); if(m.score>0) matches.add(m);
            }

            writeTTL(n1,n2,matches, OUT_TTL);
            writeRdfXml(n1,n2,matches, OUT_RDF);
            writeYAML(matches, OUT_YAML);

            System.out.println("Generated: "+OUT_TTL+", "+OUT_RDF+", "+OUT_YAML);
            System.out.println("Matches: "+matches.size());
        }catch(Exception e){
            e.printStackTrace();
        }
    }
}